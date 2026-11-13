"""my-university Python task runner. It runs inside Pyodide (browser worker and the Node validator).

run_tests(files_json, test_file)  -> JSON {"error", "tests": [{"name", "passed", "error", "hint"}], "stdout"}
run_program(files_json, main_file) -> JSON {"error", "stdout"}

Supports what the course teaches: test_* functions and Test* classes, plain assert with readable messages
("assert 5 == 6"), the test docstring as a hint, and a pytest subset provided by pytest.py
(raises, approx, fail, skip, param, mark.parametrize with ids, skip / skipif / xfail / usefixtures marks,
fixtures with yield, scopes and autouse, conftest.py, capsys, tmp_path, monkeypatch, @mock.patch arguments).
"""

import ast
import contextlib
import copy
import importlib
import inspect
import io
import json
import os
import pathlib
import shutil
import sys
import tempfile
import traceback
import types

WORKDIR = "/home/pyodide/task"
TMP_ROOT = "/tmp/qa-tmp"

OPS = {
    ast.Eq: "==",
    ast.NotEq: "!=",
    ast.Lt: "<",
    ast.LtE: "<=",
    ast.Gt: ">",
    ast.GtE: ">=",
    ast.In: "in",
    ast.NotIn: "not in",
    ast.Is: "is",
    ast.IsNot: "is not",
}


def _qa_explain(left, op, right):
    return f"assert {left!r} {op} {right!r}"


class _AssertRewriter(ast.NodeTransformer):
    """Adds a message to bare asserts, so a failure shows the compared values like pytest does."""

    def visit_Assert(self, node):
        self.generic_visit(node)
        if node.msg is not None:
            return node
        test = node.test
        if isinstance(test, ast.Compare) and len(test.ops) == 1 and type(test.ops[0]) in OPS:
            node.msg = ast.Call(
                func=ast.Name(id="_qa_explain", ctx=ast.Load()),
                args=[copy.deepcopy(test.left), ast.Constant(OPS[type(test.ops[0])]), copy.deepcopy(test.comparators[0])],
                keywords=[],
            )
        else:
            node.msg = ast.Constant("assert " + ast.unparse(test))
        return node


def _prepare(files):
    os.makedirs(WORKDIR, exist_ok=True)
    for name in os.listdir(WORKDIR):
        path = os.path.join(WORKDIR, name)
        if os.path.isfile(path):
            os.remove(path)
    for name, code in files.items():
        with open(os.path.join(WORKDIR, name), "w", encoding="utf-8") as f:
            f.write(code)
    shutil.rmtree(TMP_ROOT, ignore_errors=True)
    if WORKDIR not in sys.path:
        sys.path.insert(0, WORKDIR)
    for name in list(sys.modules):
        module_file = getattr(sys.modules[name], "__file__", None) or ""
        if module_file.startswith(WORKDIR):
            del sys.modules[name]
    importlib.invalidate_caches()


def _is_user_file(filename):
    return filename.startswith(WORKDIR) and os.path.basename(filename) != "pytest.py"


def _location(tb):
    frames = [f for f in traceback.extract_tb(tb) if _is_user_file(f.filename)]
    if not frames:
        return ""
    last = frames[-1]
    line = (last.line or "").strip()
    return f"{os.path.basename(last.filename)}, line {last.lineno}" + (f": {line}" if line else "")


def _describe(exc):
    if isinstance(exc, SyntaxError):
        where = os.path.basename(exc.filename or "")
        code = (exc.text or "").strip()
        detail = f"\n  {where}, line {exc.lineno}" + (f": {code}" if code else "")
        return f"{type(exc).__name__}: {exc.msg}{detail}"
    if isinstance(exc, AssertionError):
        message = str(exc) or "assert failed"
        loc = _location(exc.__traceback__)
        return message + (f"\n  at {loc}" if loc else "")
    message = f"{type(exc).__name__}: {exc}" if str(exc) else type(exc).__name__
    loc = _location(exc.__traceback__)
    return message + (f"\n  at {loc}" if loc else "")


def _load_test_module(name, source):
    path = os.path.join(WORKDIR, name)
    tree = _AssertRewriter().visit(ast.parse(source, filename=path))
    ast.fix_missing_locations(tree)
    module = types.ModuleType(name[:-3])
    module.__file__ = path
    module.__dict__["_qa_explain"] = _qa_explain
    sys.modules[module.__name__] = module
    exec(compile(tree, path, "exec"), module.__dict__)
    return module


def _param_id(value):
    if isinstance(value, (int, float, bool)) or value is None:
        return str(value)
    if isinstance(value, str):
        return value if value and len(value) <= 20 else repr(value)[:20]
    return type(value).__name__


def _case_id(value, row, index, ids):
    if getattr(value, "_qa_param", False) and value.id is not None:
        return str(value.id)
    if isinstance(ids, (list, tuple)) and index < len(ids):
        return str(ids[index])
    if callable(ids):
        return str(ids(row[0] if len(row) == 1 else row))
    return "-".join(_param_id(v) for v in row)


def _expand(name, fn):
    """parametrize → [(case name, arguments, marks of the case)]; pytest.param ids and marks are kept."""
    params = getattr(fn, "_qa_params", None)
    if not params:
        return [(name, {}, [])]
    combos = [({}, [], [])]
    for argnames, values, ids in reversed(params):
        names = [a.strip() for a in argnames.split(",")] if isinstance(argnames, str) else list(argnames)
        expanded = []
        for args, id_parts, marks in combos:
            for index, value in enumerate(values):
                is_param = getattr(value, "_qa_param", False)
                raw = value.values if is_param else value
                row = tuple(raw) if (is_param or len(names) > 1) else (raw,)
                case_marks = value.marks if is_param else []
                expanded.append(({**args, **dict(zip(names, row))}, id_parts + [_case_id(value, row, index, ids)], marks + case_marks))
        combos = expanded
    return [(f"{name}[{'-'.join(parts)}]", args, marks) for args, parts, marks in combos]


class _Captured(tuple):
    @property
    def out(self):
        return self[0]

    @property
    def err(self):
        return self[1]


class CapSys:
    """Minimal capsys fixture: readouterr() returns what the test printed so far."""

    def __init__(self):
        self._out = io.StringIO()
        self._err = io.StringIO()

    def readouterr(self):
        captured = _Captured((self._out.getvalue(), self._err.getvalue()))
        self._out.seek(0)
        self._out.truncate()
        self._err.seek(0)
        self._err.truncate()
        return captured


_NOTSET = object()


class MonkeyPatch:
    """pytest's monkeypatch: temporary changes to attributes, dict items and environment variables,
    undone after the test in reverse order."""

    def __init__(self):
        self._undo = []

    def setattr(self, target, name, value=_NOTSET, raising=True):
        if value is _NOTSET:
            if not isinstance(target, str):
                raise TypeError("use monkeypatch.setattr(obj, 'name', value) or monkeypatch.setattr('module.name', value)")
            path, _, attr = target.rpartition(".")
            target, name, value = importlib.import_module(path), attr, name
        old = getattr(target, name, _NOTSET)
        if old is _NOTSET and raising:
            raise AttributeError(f"{target!r} has no attribute {name!r}")
        self._undo.append((target, name, old))
        setattr(target, name, value)

    def delattr(self, target, name, raising=True):
        old = getattr(target, name, _NOTSET)
        if old is _NOTSET:
            if raising:
                raise AttributeError(name)
            return
        self._undo.append((target, name, old))
        delattr(target, name)

    def setitem(self, mapping, name, value):
        self._undo.append((mapping, name, mapping.get(name, _NOTSET), "item"))
        mapping[name] = value

    def delitem(self, mapping, name, raising=True):
        if name not in mapping:
            if raising:
                raise KeyError(name)
            return
        self._undo.append((mapping, name, mapping[name], "item"))
        del mapping[name]

    def setenv(self, name, value, prepend=None):
        text = str(value)
        if prepend and name in os.environ:
            text = text + prepend + os.environ[name]
        self.setitem(os.environ, name, text)

    def delenv(self, name, raising=True):
        self.delitem(os.environ, name, raising)

    def undo(self):
        for entry in reversed(self._undo):
            target, name, old = entry[0], entry[1], entry[2]
            if len(entry) == 4:
                if old is _NOTSET:
                    target.pop(name, None)
                else:
                    target[name] = old
            elif old is _NOTSET:
                delattr(target, name)
            else:
                setattr(target, name, old)
        self._undo = []


def _tmp_path_fixture():
    """pytest's tmp_path: a fresh empty folder for every test that asks for it."""
    os.makedirs(TMP_ROOT, exist_ok=True)
    yield pathlib.Path(tempfile.mkdtemp(dir=TMP_ROOT))


def _monkeypatch_fixture():
    patcher = MonkeyPatch()
    yield patcher
    patcher.undo()


BUILTIN_FIXTURES = {"tmp_path": _tmp_path_fixture, "monkeypatch": _monkeypatch_fixture}


def _mock_patch_count(fn):
    """@unittest.mock.patch passes mocks as the first positional arguments — they are not fixtures (as in pytest)."""
    patchings = getattr(fn, "patchings", None)
    if not patchings:
        return 0
    from unittest import mock

    return len([p for p in patchings if not p.attribute_name and p.new is mock.DEFAULT])


class _FixtureError(Exception):
    pass


class _Fixtures:
    def __init__(self, definitions):
        self.definitions = definitions
        self.shared = {}
        self.shared_teardowns = []

    def call(self, fn, args, use=()):
        values = dict(args)
        teardowns = []
        names = list(inspect.signature(fn).parameters)[_mock_patch_count(fn):]
        capsys = CapSys() if "capsys" in names else None
        if capsys is not None:
            values["capsys"] = capsys

        def resolve(name, chain):
            if name in values:
                return values[name]
            if name not in self.definitions and name in BUILTIN_FIXTURES:
                generator = BUILTIN_FIXTURES[name]()
                values[name] = next(generator)
                teardowns.append(generator)
                return values[name]
            if name not in self.definitions:
                raise _FixtureError(f"fixture '{name}' not found")
            if name in chain:
                raise _FixtureError(f"fixture '{name}' depends on itself")
            fixture = self.definitions[name]
            scope = getattr(fixture, "_qa_scope", "function")
            if scope != "function" and name in self.shared:
                values[name] = self.shared[name]
                return values[name]
            kwargs = {p: resolve(p, chain + [name]) for p in inspect.signature(fixture).parameters}
            if inspect.isgeneratorfunction(fixture):
                generator = fixture(**kwargs)
                value = next(generator)
                (teardowns if scope == "function" else self.shared_teardowns).append(generator)
            else:
                value = fixture(**kwargs)
            if scope != "function":
                self.shared[name] = value
            values[name] = value
            return value

        try:
            autouse = [n for n, f in self.definitions.items() if getattr(f, "_qa_autouse", False)]
            for name in [*autouse, *use]:
                resolve(name, [])
            kwargs = {p: resolve(p, []) for p in names}
            if capsys is None:
                fn(**kwargs)
            else:
                with contextlib.redirect_stdout(capsys._out), contextlib.redirect_stderr(capsys._err):
                    fn(**kwargs)
        finally:
            for generator in reversed(teardowns):
                with contextlib.suppress(StopIteration):
                    next(generator)

    def finish(self):
        for generator in reversed(self.shared_teardowns):
            with contextlib.suppress(StopIteration):
                next(generator)


def _fixture_definitions(*modules):
    found = {}
    for module in modules:
        for name, value in vars(module).items():
            if callable(value) and getattr(value, "_qa_fixture", False):
                found[getattr(value, "_qa_name", None) or name] = value
    return found


def _collect(module):
    """Tests in file order, like pytest: test_* functions and test_* methods of Test* classes without __init__.

    Returns (name, function, owner class or None).
    """
    found = []
    for name, obj in vars(module).items():
        if getattr(obj, "__module__", None) != module.__name__:
            continue
        if name.startswith("test") and inspect.isfunction(obj):
            found.append((name, obj, None))
        elif name.startswith("Test") and inspect.isclass(obj) and "__init__" not in vars(obj):
            for attr, member in vars(obj).items():
                if attr.startswith("test") and inspect.isfunction(member):
                    found.append((f"{name}::{attr}", member, obj))
    return found


def _marks_of(fn, owner, case_marks):
    """(name, args, kwargs) of class marks, function marks and pytest.param marks."""
    class_marks = list(getattr(owner, "_qa_marks", [])) if owner is not None else []
    param_marks = [(m.name, m.args, m.kwargs) for m in case_marks if hasattr(m, "name")]
    return class_marks + list(getattr(fn, "_qa_marks", [])) + param_marks


def _skip_reason(marks):
    for name, args, kwargs in marks:
        if name == "skip":
            return kwargs.get("reason") or (args[0] if args else "unconditional skip")
        if name == "skipif":
            condition = args[0] if args else kwargs.get("condition", False)
            if condition:
                return kwargs.get("reason", "condition is true")
    return None


def _xfail_of(marks):
    for name, args, kwargs in marks:
        if name == "xfail":
            condition = args[0] if args and isinstance(args[0], bool) else kwargs.get("condition", True)
            if condition:
                return kwargs
    return None


def _used_fixtures(marks):
    return [fixture for name, args, _ in marks if name == "usefixtures" for fixture in args]


def _case(name, passed=True, error="", hint=""):
    return {"name": name, "passed": passed, "error": error, "hint": hint}


def run_tests(files_json, test_file="tests.py"):
    files = json.loads(files_json)
    result = {"error": None, "tests": [], "stdout": ""}
    out = io.StringIO()
    _prepare(files)
    with contextlib.redirect_stdout(out):
        try:
            conftest = importlib.import_module("conftest") if "conftest.py" in files else None
            module = _load_test_module(test_file, files[test_file])
        except BaseException as exc:  # noqa: BLE001 — any import problem is reported to the learner
            result["error"] = _describe(exc)
            result["stdout"] = out.getvalue()
            return json.dumps(result)
        fixtures = _Fixtures(_fixture_definitions(*(m for m in (conftest, module) if m is not None)))
        for name, fn, owner in _collect(module):
            hint = inspect.getdoc(fn) or ""
            for case_name, args, case_marks in _expand(name, fn):
                marks = _marks_of(fn, owner, case_marks)
                skip_reason = _skip_reason(marks)
                if skip_reason is not None:
                    result["tests"].append(_case(f"{case_name} (skipped: {skip_reason})"))
                    continue
                xfail = _xfail_of(marks)
                try:
                    target = getattr(owner(), fn.__name__) if owner is not None else fn
                    fixtures.call(target, args, _used_fixtures(marks))
                except _FixtureError as exc:
                    result["tests"].append(_case(case_name, False, f"Fixture error: {exc}", hint))
                except BaseException as exc:  # noqa: BLE001 — a crashing test is a failed test
                    expected = xfail is not None and (xfail.get("raises") is None or isinstance(exc, xfail["raises"]))
                    if getattr(exc, "_qa_skip", False):
                        result["tests"].append(_case(f"{case_name} (skipped: {exc})"))
                    elif expected:
                        result["tests"].append(_case(f"{case_name} (xfail)"))
                    else:
                        result["tests"].append(_case(case_name, False, _describe(exc), hint))
                else:
                    if xfail is None:
                        result["tests"].append(_case(case_name))
                    elif xfail.get("strict"):
                        result["tests"].append(_case(case_name, False, "[XPASS(strict)] the test was expected to fail but passed", hint))
                    else:
                        result["tests"].append(_case(f"{case_name} (XPASS)"))
        with contextlib.suppress(BaseException):
            fixtures.finish()
    result["stdout"] = out.getvalue()
    return json.dumps(result)


def run_program(files_json, main_file="solution.py"):
    files = json.loads(files_json)
    result = {"error": None, "stdout": ""}
    out = io.StringIO()
    _prepare(files)
    path = os.path.join(WORKDIR, main_file)
    with contextlib.redirect_stdout(out):
        try:
            code = compile(files[main_file], path, "exec")
            exec(code, {"__name__": "__main__", "__file__": path})
        except BaseException as exc:  # noqa: BLE001 — show any crash to the learner
            result["error"] = _describe(exc)
    result["stdout"] = out.getvalue()
    return json.dumps(result)
