"""my-university Python task runner. It runs inside Pyodide (browser worker and the Node validator).

run_tests(files_json, test_file)  -> JSON {"error", "tests": [{"name", "passed", "error", "hint"}], "stdout"}
run_program(files_json, main_file) -> JSON {"error", "stdout"}

Supports what the course teaches: test_* functions and Test* classes, plain assert with readable messages
("assert 5 == 6"), the test docstring as a hint, and a pytest subset provided by pytest.py
(raises, approx, fail, mark.parametrize, fixtures with yield, conftest.py, capsys, tmp_path).
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


def _expand(name, fn):
    params = getattr(fn, "_qa_params", None)
    if not params:
        return [(name, {})]
    combos = [{}]
    for argnames, values in reversed(params):
        names = [a.strip() for a in argnames.split(",")] if isinstance(argnames, str) else list(argnames)
        expanded = []
        for combo in combos:
            for value in values:
                row = tuple(value) if len(names) > 1 else (value,)
                expanded.append({**combo, **dict(zip(names, row))})
        combos = expanded
    return [(f"{name}[{'-'.join(_param_id(v) for v in combo.values())}]", combo) for combo in combos]


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


def _new_tmp_path():
    """pytest's tmp_path: a fresh empty folder for every test that asks for it."""
    os.makedirs(TMP_ROOT, exist_ok=True)
    return pathlib.Path(tempfile.mkdtemp(dir=TMP_ROOT))


class _FixtureError(Exception):
    pass


class _Fixtures:
    def __init__(self, definitions):
        self.definitions = definitions
        self.shared = {}
        self.shared_teardowns = []

    def call(self, fn, args):
        values = dict(args)
        teardowns = []
        capsys = CapSys() if "capsys" in inspect.signature(fn).parameters else None
        if capsys is not None:
            values["capsys"] = capsys

        def resolve(name, chain):
            if name in values:
                return values[name]
            if name == "tmp_path" and name not in self.definitions:
                values[name] = _new_tmp_path()
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
            kwargs = {p: resolve(p, []) for p in inspect.signature(fn).parameters}
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
            for case_name, args in _expand(name, fn):
                try:
                    target = getattr(owner(), fn.__name__) if owner is not None else fn
                    fixtures.call(target, args)
                    result["tests"].append({"name": case_name, "passed": True, "error": "", "hint": ""})
                except _FixtureError as exc:
                    result["tests"].append({"name": case_name, "passed": False, "error": f"Fixture error: {exc}", "hint": hint})
                except BaseException as exc:  # noqa: BLE001 — a crashing test is a failed test
                    result["tests"].append({"name": case_name, "passed": False, "error": _describe(exc), "hint": hint})
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
