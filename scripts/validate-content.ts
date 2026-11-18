/**
 * Validates all course content and proves every task is solvable:
 *  - JSON files match the schemas (src/content/schema.ts)
 *  - code tasks: solution compiles with 0 errors and passes all tests; starter does NOT pass
 *  - test-case / written tasks: the model answer passes the task's own rules
 *  - bug-report tasks: each model report passes quality checks and is matched to its own bug
 *  - value-set tasks: generator exists and accepts its own expected answer for several seeds
 *  - quiz / classify / order: structural sanity (one correct option, known categories, unique items…)
 *  - sql tasks: database scripts load; every reference query runs and is accepted (SELECTs return rows,
 *    change statements really change the result of their verify query)
 *
 * Run: npm run validate
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { createCompiler } from '../src/runner/compiler';
import { executeModules } from '../src/runner/harness';
import { HARNESS_DTS } from '../src/runner/harness-dts';
import { isNeededLibFile } from '../src/runner/lib-files';
import { evaluateCodeRules } from '../src/runner/client';
import { evaluatePythonRules } from '../src/runner/python-rules';
import type { PythonRunResult } from '../src/runner/python-protocol';
import { runPythonJob } from './python-node';
import { missingPythonTaskLab, runPythonTaskJobs } from '../server/lab-python-tasks';
import { parallelism, runPool } from '../server/lab-python';
import { courseSchema, formatZodError, lessonSchema, moduleSchema, taskSchema, WEB_FILES, type Task, type WebFile } from '../src/content/schema';
import { evaluateWebRules, LEARNER_FILE_OF, linksStylesheet } from '../src/runner/web-page';
import type { WebCheckResult } from '../src/runner/web';
import { startWebRunner, type WebRunnerStart } from './web-node';
import { checkBugReportQuality, checkTestCase, evaluateRules, matchBug, type FormValues } from '../src/features/tasks/forms';
import { GENERATORS } from '../src/features/tasks/generators';
import { PLAYGROUND_PAGES } from '../src/playground/registry';
import { JSDOM } from 'jsdom';
import { checkChallenge, prepareSnippet } from '../src/features/tasks/selectors';
import { evaluateTestSuite, SUBJECT_FILE } from '../src/runner/mutation';
import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { checkSqlChallenge, compareResults, openDatabase, runChange, runOnFreshDb } from '../src/features/sql/engine';

/** Theory files shorter than this are treated as "not written yet". */
const MIN_THEORY_LENGTH = 200;
/** How many seeds (0, 1, 2…) are tried for every value-set generator. */
const GENERATOR_SEED_COUNT = 4;
const GENERATOR_SEEDS = Array.from({ length: GENERATOR_SEED_COUNT }, (_, i) => i);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(root, 'content');
const modulesDir = path.join(contentDir, 'modules');
const coursesDir = path.join(contentDir, 'courses');
const errors: string[] = [];
const warnings: string[] = [];

const rel = (p: string): string => path.relative(root, p).split(path.sep).join('/');
const readJson = (p: string): unknown => JSON.parse(fs.readFileSync(p, 'utf8'));
const dirs = (p: string): string[] =>
  fs.existsSync(p) ? fs.readdirSync(p).filter((d) => fs.statSync(path.join(p, d)).isDirectory()).sort() : [];
const fail = (where: string, message: string): void => {
  errors.push(`${rel(where)}: ${message}`);
};
const duplicates = (values: string[]): string[] => values.filter((v, i) => values.indexOf(v) !== i);

const require = createRequire(import.meta.url);
const libDir = path.join(path.dirname(require.resolve('typescript/package.json')), 'lib');
const libs = Object.fromEntries(
  fs
    .readdirSync(libDir)
    .filter(isNeededLibFile)
    .map((f) => [f, fs.readFileSync(path.join(libDir, f), 'utf8')]),
);
const compile = createCompiler(ts, libs);

type TaskOf<T extends Task['type']> = Extract<Task, { type: T }>;
type Checker<T extends Task['type']> = (dir: string, task: TaskOf<T>) => void | Promise<void>;

/* ---------- per-type checks ---------- */

const RESERVED_CODE_FILES = new Set(['starter.ts', 'solution.ts', 'tests.ts']);

const readSupport = (dir: string): Record<string, string> =>
  Object.fromEntries(
    fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.ts') && !RESERVED_CODE_FILES.has(f))
      .map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]),
  );

const supportPaths = (support: Record<string, string>) => Object.fromEntries(Object.entries(support).map(([n, c]) => [`/${n}`, c]));
const jsOnly = (outputs: Record<string, string>) => Object.fromEntries(Object.entries(outputs).filter(([p]) => p.endsWith('.js')));

const checkTestsTask = async (dir: string, task: TaskOf<'code'>, support: Record<string, string>) => {
  const needed = ['starter.ts', 'solution.ts', SUBJECT_FILE].map((f) => path.join(dir, f));
  const missing = needed.filter((f) => !fs.existsSync(f));
  missing.forEach((f) => fail(f, 'missing (tests mode needs starter.ts, solution.ts and subject.ts)'));
  if (missing.length) return;
  const mutantDir = path.join(dir, 'mutants');
  const files = fs.existsSync(mutantDir) ? fs.readdirSync(mutantDir).filter((f) => f.endsWith('.ts')) : [];
  // Strips the ".ts" extension: matches "off-by-one.ts" → "off-by-one", rejects "notes.ts.bak". https://regex101.com/?regex=%5C.ts%24
  const mutantCode = Object.fromEntries(files.map((f) => [f.replace(/\.ts$/, ''), fs.readFileSync(path.join(mutantDir, f), 'utf8')]));
  const ids = task.mutants.map((m) => m.id);
  if (ids.length === 0) fail(dir, 'tests mode needs at least one mutant');
  duplicates(ids).forEach((id) => fail(dir, `duplicate mutant id "${id}"`));
  ids.filter((id) => mutantCode[id] === undefined).forEach((id) => fail(dir, `mutants/${id}.ts is missing`));
  Object.keys(mutantCode).filter((id) => !ids.includes(id)).forEach((id) => fail(dir, `mutants/${id}.ts is not listed in task.json`));
  Object.entries(mutantCode).forEach(([id, code]) => {
    if (code.trim() === (support[SUBJECT_FILE] ?? '').trim()) fail(dir, `mutant "${id}" is identical to subject.ts`);
    const c = compile({ ...supportPaths(support), [`/${SUBJECT_FILE}`]: code, '/harness.d.ts': HARNESS_DTS });
    c.diagnostics
      .filter((d) => d.category === 'error')
      .forEach((d) => fail(dir, `mutant "${id}" does not compile: ${d.file}:${d.line} TS${d.code} ${d.message}`));
  });

  const deps = { compile: async (f: Record<string, string>) => compile(f), execute: executeModules };
  const run = (tests: string) => evaluateTestSuite(deps, { tests, support, mutantCode, mutants: task.mutants, minTests: task.minTests });
  const solutionCode = fs.readFileSync(path.join(dir, 'solution.ts'), 'utf8');
  const sol = await run(solutionCode);
  evaluateCodeRules(solutionCode, task.codeRules).forEach((r) => fail(dir, `reference tests break a code rule: ${r}`));
  if (!sol.passed) {
    const details = [
      ...sol.codeErrors.map((d) => `${d.file}:${d.line} TS${d.code} ${d.message}`),
      ...sol.results.filter((r) => !r.passed).map((r) => `test "${r.name}" fails on subject.ts: ${r.error}`),
      ...sol.mutants.filter((m) => !m.killed).map((m) => `mutant "${m.id}" survives the reference tests`),
      ...(sol.tooFewTests ? [`fewer than minTests (${task.minTests}) tests`] : []),
      ...(sol.runtimeError ? [`runtime: ${sol.runtimeError}`] : []),
    ];
    fail(dir, `reference tests (solution.ts) do not pass:\n      ${details.join('\n      ')}`);
  }
  const st = await run(fs.readFileSync(path.join(dir, 'starter.ts'), 'utf8'));
  if (st.passed) fail(dir, 'starter tests already catch every mutant (the task is trivial)');
};

const checkCode: Checker<'code'> = async (dir, task) => {
  const support = readSupport(dir);
  if (task.mode === 'tests') {
    await checkTestsTask(dir, task, support);
    return;
  }
  const files = ['starter.ts', 'solution.ts', 'tests.ts'].map((f) => path.join(dir, f));
  const missing = files.filter((f) => !fs.existsSync(f));
  missing.forEach((f) => fail(f, 'missing'));
  if (missing.length) return;
  const [starter, solution, tests] = files.map((f) => fs.readFileSync(f, 'utf8'));

  const evaluate = async (code: string) => {
    const c = compile({ ...supportPaths(support), '/solution.ts': code, '/tests.ts': tests, '/harness.d.ts': HARNESS_DTS });
    const errs = c.diagnostics.filter((d) => d.category === 'error');
    const run = await executeModules({
      modules: jsOnly(c.outputs),
      entry: '/tests.js',
      collectTests: true,
    });
    const rules = evaluateCodeRules(code, task.codeRules);
    const passed = errs.length === 0 && run.results.length > 0 && run.results.every((r) => r.passed) && rules.length === 0;
    return { errs, run, rules, passed };
  };

  const sol = await evaluate(solution);
  if (!sol.passed) {
    const details = [
      ...sol.errs.map((d) => `${d.file}:${d.line} TS${d.code} ${d.message}`),
      ...sol.run.results.filter((r) => !r.passed).map((r) => `test "${r.name}": ${r.error}`),
      ...sol.rules.map((r) => `rule: ${r}`),
      ...(sol.run.runtimeError ? [`runtime: ${sol.run.runtimeError}`] : []),
      ...(sol.run.results.length === 0 ? ['no tests were registered'] : []),
    ];
    fail(dir, `solution does not pass:\n      ${details.join('\n      ')}`);
  }
  const st = await evaluate(starter);
  if (st.passed) fail(dir, 'starter code already passes all checks (the task is trivial)');
};

const checkQuiz: Checker<'quiz'> = (dir, task) => {
  task.questions
    .filter((q) => q.kind === 'single' && q.options.filter((o) => o.correct).length !== 1)
    .forEach((q) => fail(dir, `question "${q.id}" (single) must have exactly 1 correct option`));
  task.questions
    .filter((q) => q.kind === 'multiple' && !q.options.some((o) => o.correct))
    .forEach((q) => fail(dir, `question "${q.id}" (multiple) needs at least 1 correct option`));
  duplicates(task.questions.map((q) => q.id)).forEach((id) => fail(dir, `duplicate question id "${id}"`));
};

interface CourseOutline {
  id: string;
  slugs: string[];
}

const courseOutlines = (): CourseOutline[] =>
  (fs.existsSync(coursesDir) ? fs.readdirSync(coursesDir).filter((f) => f.endsWith('.json')) : []).flatMap((f) => {
    const r = courseSchema.safeParse(readJson(path.join(coursesDir, f)));
    return r.success ? [{ id: f.slice(0, -'.json'.length), slugs: r.data.tracks.flatMap((t) => t.modules.map((m) => m.slug)) }] : [];
  });

const checkTechCheck: Checker<'tech-check'> = (dir, task) => {
  duplicates(task.questions.map((q) => q.id)).forEach((id) => fail(dir, `duplicate question id "${id}"`));
  const known = new Set(dirs(modulesDir));
  task.questions.filter((q) => !known.has(q.module)).forEach((q) => fail(dir, `question "${q.id}": unknown module "${q.module}"`));
  const host = path.relative(modulesDir, dir).split(path.sep)[0];
  courseOutlines()
    .filter((c) => c.slugs.includes(host))
    .forEach((c) => {
      const pool = task.questions.filter((q) => c.slugs.includes(q.module)).length;
      if (pool === 0) fail(dir, `course "${c.id}" gets no questions from this tech check`);
      else if (pool < task.show) warnings.push(`${rel(dir)}: course "${c.id}" gets only ${pool} questions (show ${task.show})`);
    });
};

const checkValueSet: Checker<'value-set'> = (dir, task) => {
  const gen = GENERATORS[task.generator.name];
  if (!gen) {
    fail(dir, `unknown generator "${task.generator.name}"`);
    return;
  }
  GENERATOR_SEEDS.map((seed) => ({ seed, problem: gen(task.generator.params, seed) }))
    .filter(({ problem }) => problem.feedback(problem.expected).length > 0)
    .forEach(({ seed }) => fail(dir, `generator seed ${seed} rejects its own expected answer`));
};

const checkTestCaseTask: Checker<'test-case'> = (dir, task) => {
  const failures = checkTestCase(task.model as unknown as FormValues, task.rules);
  if (failures.length) fail(dir, `model answer fails its own rules:\n      ${failures.join('\n      ')}`);
};

const checkBugReportTask: Checker<'bug-report'> = (dir, task) => {
  duplicates(task.bugs.map((b) => b.id)).forEach((id) => fail(dir, `duplicate bug id "${id}"`));
  task.bugs.forEach((b) => {
    const values = b.model as unknown as FormValues;
    const quality = checkBugReportQuality(values);
    if (quality.length) fail(dir, `model report for "${b.id}" fails quality checks: ${quality.join(' | ')}`);
    const m = matchBug(values, task.bugs, []);
    if (m.bug?.id !== b.id) fail(dir, `model report for "${b.id}" is matched to "${m.bug?.id ?? 'nothing'}"`);
    if (!b.severity.includes(b.model.severity)) fail(dir, `model severity for "${b.id}" is not in its accepted list`);
  });
  if (task.minBugs > task.bugs.length) fail(dir, 'minBugs > number of bugs');
};

const checkClassify: Checker<'classify'> = (dir, task) => {
  const categoryIds = task.categories.map((c) => c.id);
  duplicates(categoryIds).forEach((id) => fail(dir, `duplicate category id "${id}"`));
  duplicates(task.items.map((i) => i.id)).forEach((id) => fail(dir, `duplicate item id "${id}"`));
  task.items
    .filter((i) => !categoryIds.includes(i.category))
    .forEach((i) => fail(dir, `item "${i.id}" uses unknown category "${i.category}"`));
  categoryIds
    .filter((id) => !task.items.some((i) => i.category === id))
    .forEach((id) => fail(dir, `category "${id}" has no items`));
  if (task.show !== undefined && task.show > task.items.length) fail(dir, '"show" is larger than the number of items');
};

const checkOrder: Checker<'order'> = (dir, task) => {
  duplicates(task.items).forEach((item) => fail(dir, `duplicate step "${item}"`));
};

const checkWritten: Checker<'written'> = (dir, task) => {
  const fieldIds = task.fields.map((f) => f.id);
  duplicates(fieldIds).forEach((id) => fail(dir, `duplicate field id "${id}"`));
  task.rules
    .filter((r) => r.field !== 'any' && !fieldIds.includes(r.field))
    .forEach((r) => fail(dir, `rule refers to unknown field "${r.field}"`));
  fieldIds.filter((id) => task.model[id] === undefined).forEach((id) => fail(dir, `model answer has no value for field "${id}"`));
  const failures = evaluateRules(task.rules, task.model);
  if (failures.length) fail(dir, `model answer fails its own rules:\n      ${failures.join('\n      ')}`);
};

const checkTable: Checker<'table'> = (dir, task) => {
  const columnIds = task.answerColumns.map((c) => c.id);
  duplicates(columnIds).forEach((id) => fail(dir, `duplicate answer column id "${id}"`));
  task.rows.forEach((row, r) => {
    if (row.given.length !== task.givenColumns.length) {
      fail(dir, `row ${r + 1}: ${row.given.length} given values, but ${task.givenColumns.length} given columns`);
    }
    task.answerColumns
      .filter((col) => !col.options.includes(row.answers[col.id] ?? ''))
      .forEach((col) => fail(dir, `row ${r + 1}: answer for "${col.id}" is missing or not one of its options`));
  });
};

const checkSelectorTask: Checker<'selector'> = (dir, task) => {
  const doc = new JSDOM(task.html).window.document;
  const expected = prepareSnippet(doc);
  const ids = task.challenges.map((c) => c.id);
  duplicates(ids).forEach((id) => fail(dir, `duplicate challenge id "${id}"`));
  [...expected.keys()].filter((id) => !ids.includes(id)).forEach((id) => fail(dir, `data-expect refers to unknown challenge "${id}"`));
  task.challenges.forEach((c) => {
    const targets = expected.get(c.id) ?? [];
    if (targets.length === 0) {
      fail(dir, `challenge "${c.id}" has no target elements (add data-expect="${c.id}")`);
      return;
    }
    const result = checkChallenge(doc, task.syntax, c, targets, c.model);
    if (result.status !== 'correct') fail(dir, `reference selector for "${c.id}" (${c.model}) is not accepted: ${result.message}`);
  });
};

const databasesDir = path.join(contentDir, 'databases');
const readDatabase = (name: string): string | null => {
  const file = path.join(databasesDir, `${name}.sql`);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
};
let sqlJs: SqlJsStatic | null = null;
const getSqlJs = async (): Promise<SqlJsStatic> => {
  sqlJs ??= await initSqlJs();
  return sqlJs;
};

/** True when a task-defined rule pattern from content JSON compiles. */
const isValidPattern = (pattern: string, flags = 'i'): boolean => {
  try {
    /*
     * Task-defined rule pattern from content JSON, e.g. "join" (require):
     * matches "SELECT … JOIN orders …", rejects "SELECT … FROM orders WHERE …".
     * https://regex101.com/?regex=join&flags=i
     */
    return new RegExp(pattern, flags) instanceof RegExp;
  } catch {
    return false;
  }
};

const checkSqlTask: Checker<'sql'> = async (dir, task) => {
  const names = Array.isArray(task.database) ? task.database : [task.database];
  const missing = names.filter((name) => readDatabase(name) === null);
  if (missing.length > 0) {
    fail(dir, `unknown database "${missing.join('", "')}" (expected content/databases/<name>.sql)`);
    return;
  }
  const scripts = names.map((name) => readDatabase(name) ?? '');
  const SQL = await getSqlJs();
  try {
    openDatabase(SQL, scripts).close();
  } catch (e) {
    fail(dir, `database scripts ${names.join(' + ')} fail to load: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }
  duplicates(task.challenges.map((c) => c.id)).forEach((id) => fail(dir, `duplicate challenge id "${id}"`));
  const badRules = task.challenges.flatMap((c) => c.rules.filter((r) => !isValidPattern(r.pattern, r.flags)).map((r) => `"${c.id}": /${r.pattern}/`));
  if (badRules.length > 0) {
    fail(dir, `invalid rule regex in ${badRules.join(', ')}`);
    return;
  }
  task.challenges.forEach((c) => {
    const untouched = runOnFreshDb(SQL, scripts, c.verify ?? c.model);
    if (!untouched.ok) {
      fail(dir, `${c.verify ? 'verify' : 'reference'} query of "${c.id}" fails: ${untouched.error}`);
      return;
    }
    if (!c.verify && (untouched.result?.rows.length ?? 0) === 0) fail(dir, `reference query of "${c.id}" returns 0 rows — add data so a wrong query is visible`);
    if (c.verify) {
      const changed = runChange(SQL, scripts, c.model, c.verify);
      if (!changed.ok) fail(dir, `reference statement of "${c.id}" fails: ${changed.error}`);
      if (changed.ok && compareResults(changed.result, untouched.result, true).equal) {
        fail(dir, `reference statement of "${c.id}" does not change the result of its verify query (doing nothing would pass)`);
      }
    }
    const self = checkSqlChallenge(SQL, scripts, c, c.model);
    if (self.status !== 'correct') fail(dir, `reference of "${c.id}" is not accepted: ${self.message}`);
  });
};

/**
 * Static checks only — the reference spec is run in real Playwright by `npm run validate:lab`
 * (scripts/validate-lab.ts), which needs Chromium and the dev server.
 */
/** Per language: the spec files and the import every reference spec must have. */
/*
 * TypeScript specs import @playwright/test: matches "import { test, expect } from '@playwright/test';", rejects a file without it.
 * https://regex101.com/?regex=from%20'%40playwright%2Ftest'
 */
const TS_PLAYWRIGHT_IMPORT = /from '@playwright\/test'/;
/*
 * Python lab tests use Playwright (UI) or requests (API, module 29+): matches "from playwright.sync_api import Page, expect"
 * and "import requests", rejects "import pytest" alone. https://regex101.com/?regex=%5E(from%20playwright%5C.sync_api%20import%7Cimport%20requests%5Cb)&flags=m
 */
const PY_LAB_IMPORT = /^(from playwright\.sync_api import|import requests\b)/m;

const PLAYWRIGHT_FILES = {
  typescript: { ext: '.ts', requiredImport: TS_PLAYWRIGHT_IMPORT, importHint: "import test/expect from '@playwright/test'" },
  python: { ext: '.py', requiredImport: PY_LAB_IMPORT, importHint: 'import Page/expect from playwright.sync_api (UI tests) or import requests (API tests)' },
} as const;

const checkPlaywrightTask: Checker<'playwright'> = (dir, task) => {
  const read = (file: string): string | null => (fs.existsSync(path.join(dir, file)) ? fs.readFileSync(path.join(dir, file), 'utf8') : null);
  const files = PLAYWRIGHT_FILES[task.language];
  const starter = read(`starter${files.ext}`);
  const solution = read(`solution${files.ext}`);
  if (starter === null || solution === null) {
    fail(dir, `${task.language} playwright tasks need starter${files.ext} and solution${files.ext}`);
    return;
  }
  if (!files.requiredImport.test(solution)) fail(dir, `solution${files.ext} must ${files.importHint}`);
  if (starter.trim() === solution.trim()) fail(dir, `starter${files.ext} is identical to solution${files.ext}`);
  // Mutants may come from any playground page or the mock API ("api"): API + UI tasks combine them.
  const bugIds = PLAYGROUND_PAGES.flatMap((p) => p.bugIds ?? []);
  duplicates(task.mutants.map((m) => m.id)).forEach((id) => fail(dir, `duplicate mutant id "${id}"`));
  task.mutants.filter((m) => !bugIds.includes(m.id)).forEach((m) => fail(dir, `mutant "${m.id}" is not a bug id of any playground page (registry.ts bugIds)`));
  const badRules = task.codeRules.filter((r) => !isValidPattern(r.pattern, r.flags ?? 'm'));
  badRules.forEach((r) => fail(dir, `invalid code rule regex /${r.pattern}/`));
  const ruleFailures = task.language === 'python' ? evaluatePythonRules(solution, task.codeRules) : evaluateCodeRules(solution, task.codeRules);
  if (badRules.length === 0) ruleFailures.forEach((m) => fail(dir, `solution${files.ext} breaks its own code rule: ${m}`));
};

/* ---------- python tasks (Pyodide in Node, same runner as the browser) ---------- */

const PY_RESERVED = new Set(['starter.py', 'solution.py', 'tests.py']);

const PY_SUPPORT_EXT = ['.py', '.html'];
const MUTANTS_DIR = 'mutants';

/** Support files of a python task, also in folders (lab tasks with a project layout), keyed by their posix path. */
function readPythonSupport(dir: string, prefix = ''): Record<string, string> {
  return Object.fromEntries(
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry): [string, string][] => {
      const rel = prefix + entry.name;
      if (entry.isDirectory()) return entry.name === MUTANTS_DIR && prefix === '' ? [] : Object.entries(readPythonSupport(path.join(dir, entry.name), `${rel}/`));
      const isSupport = PY_SUPPORT_EXT.some((ext) => entry.name.endsWith(ext)) && !(prefix === '' && PY_RESERVED.has(entry.name));
      return isSupport ? [[rel, fs.readFileSync(path.join(dir, entry.name), 'utf8')]] : [];
    }),
  );
}

type PythonExec = (kind: 'test' | 'run', files: Record<string, string>, entry: string) => Promise<PythonRunResult>;

/** "runtime": "lab" tasks run with real pytest in lab/.venv (one job per call; the pool below runs tasks side by side). */
const runLabJob: PythonExec = async (kind, files, entry) => {
  const response = await runPythonTaskJobs(root, [{ kind, files, entry }]);
  if (!response.ok) return { error: response.message, tests: [], stdout: '' };
  return response.results[0] ?? { error: 'no result', tests: [], stdout: '' };
};

/** Lab tasks are checked after all other tasks (separate processes, several at a time), or skipped without the venv. */
const labChecks: (() => Promise<void>)[] = [];
const labMissing = missingPythonTaskLab(root);
const labSkipped: string[] = [];

/** Why a python test run is not green (empty when every collected test passed). */
const pythonFailures = (run: PythonRunResult): string[] => [
  ...(run.timedOut ? ['the run hit its time limit and was stopped'] : []),
  ...(run.error ? [`error: ${run.error}`] : []),
  ...(run.tests.length === 0 && !run.error && !run.timedOut ? ['no test_* functions were collected'] : []),
  ...run.tests.filter((t) => !t.passed).map((t) => `test "${t.name}": ${t.error}`),
];

interface PythonGrade {
  failures: string[];
  survivors: string[];
  tooFew: boolean;
}

/** Tests mode: run a tests file on subject.py, then on every mutant (only when green on subject.py). */
interface PythonFileNames {
  /** Where the code under check goes: the learner's file (solution mode) or the tests file (tests mode). */
  file: string;
  /** Tests mode: the file each mutant replaces. */
  subject: string;
}

async function gradePythonTests(
  exec: PythonExec,
  tests: string,
  support: Record<string, string>,
  mutants: Record<string, string>,
  names: PythonFileNames,
  minTests?: number,
): Promise<PythonGrade> {
  const base = await exec('test', { ...support, [names.file]: tests }, names.file);
  const failures = pythonFailures(base);
  const tooFew = minTests !== undefined && base.tests.length < minTests;
  if (failures.length > 0) return { failures, survivors: [], tooFew };
  const survivors = await Object.entries(mutants).reduce<Promise<string[]>>(async (accPromise, [id, code]) => {
    const acc = await accPromise;
    const run = await exec('test', { ...support, [names.subject]: code, [names.file]: tests }, names.file);
    return pythonFailures(run).length > 0 ? acc : [...acc, id];
  }, Promise.resolve([]));
  return { failures, survivors, tooFew };
}

const checkPythonTask: Checker<'python'> = async (dir, task) => {
  const testsMode = task.mode === 'tests';
  const required = testsMode ? ['starter.py', 'solution.py', task.subject] : ['starter.py', 'solution.py', 'tests.py'];
  const missing = required.filter((f) => !fs.existsSync(path.join(dir, f)));
  missing.forEach((f) => fail(path.join(dir, f), 'missing'));
  if (missing.length > 0) return;
  const read = (f: string) => fs.readFileSync(path.join(dir, f), 'utf8');
  const [starter, solution] = [read('starter.py'), read('solution.py')];
  if (starter.trim() === solution.trim()) fail(dir, 'starter.py is identical to solution.py');
  const badRules = task.codeRules.filter((r) => !isValidPattern(r.pattern, r.flags ?? 'm'));
  badRules.forEach((r) => fail(dir, `invalid code rule regex /${r.pattern}/`));
  if (badRules.length === 0) evaluatePythonRules(solution, task.codeRules, task.file).forEach((m) => fail(dir, `solution.py breaks its own code rule: ${m}`));
  const support = readPythonSupport(dir);
  if (task.runtime === 'lab') {
    if (labMissing !== null) labSkipped.push(dir);
    else labChecks.push(() => runPythonChecks(dir, task, runLabJob, { starter, solution, support }));
    return;
  }
  await runPythonChecks(dir, task, runPythonJob, { starter, solution, support });
};

interface PythonSources {
  starter: string;
  solution: string;
  support: Record<string, string>;
}

/** Solution mode: solution.py passes tests.py and starter.py does not. Tests mode: the reference kills every mutant. */
async function runPythonChecks(dir: string, task: TaskOf<'python'>, exec: PythonExec, { starter, solution, support }: PythonSources): Promise<void> {
  const testsMode = task.mode === 'tests';
  const read = (f: string) => fs.readFileSync(path.join(dir, f), 'utf8');
  const names: PythonFileNames = { file: task.file ?? (testsMode ? 'tests.py' : 'solution.py'), subject: task.subject };
  if (testsMode) {
    duplicates(task.mutants.map((m) => m.id)).forEach((id) => fail(dir, `duplicate mutant id "${id}"`));
    const mutantFile = (id: string) => path.join(dir, 'mutants', `${id}.py`);
    task.mutants.filter((m) => !fs.existsSync(mutantFile(m.id))).forEach((m) => fail(mutantFile(m.id), 'missing'));
    const mutants = Object.fromEntries(task.mutants.filter((m) => fs.existsSync(mutantFile(m.id))).map((m) => [m.id, fs.readFileSync(mutantFile(m.id), 'utf8')]));
    const reference = await gradePythonTests(exec, solution, support, mutants, names, task.minTests);
    if (reference.failures.length > 0) fail(dir, `reference tests (solution.py) are not green on ${task.subject}: ${reference.failures.join(' | ')}`);
    reference.survivors.forEach((id) => fail(dir, `reference tests do not catch mutant "${id}"`));
    if (reference.tooFew) fail(dir, `reference tests have fewer than minTests (${task.minTests})`);
    const start = await gradePythonTests(exec, starter, support, mutants, names, task.minTests);
    if (start.failures.length === 0 && start.survivors.length === 0 && !start.tooFew) fail(dir, 'starter.py already passes — it must leave work to do');
    return;
  }

  const tests = read('tests.py');
  const sol = await exec('test', { ...support, [names.file]: solution, 'tests.py': tests }, 'tests.py');
  const solFailures = pythonFailures(sol);
  if (solFailures.length > 0) fail(dir, `solution.py does not pass tests.py: ${solFailures.join(' | ')}`);
  const start = await exec('test', { ...support, [names.file]: starter, 'tests.py': tests }, 'tests.py');
  if (pythonFailures(start).length === 0 && evaluatePythonRules(starter, task.codeRules, task.file).length === 0) fail(dir, 'starter.py already passes the tests');
}

/* ---------- web page tasks (the app's checker in headless Chromium, scripts/web-node.ts) ---------- */

type WebFiles = Partial<Record<WebFile, string>>;
let webRunner: Promise<WebRunnerStart> | null = null;
const webSkipped: string[] = [];
/** File names a web task folder may contain besides task.json. */
const WEB_TASK_FILES = new Set(['task.json', 'tests.js', ...WEB_FILES, ...Object.keys(LEARNER_FILE_OF).flatMap((ext) => [`starter.${ext}`, `solution.${ext}`])]);

function readWebFiles(dir: string, prefix: string): WebFiles {
  return Object.fromEntries(
    Object.entries(LEARNER_FILE_OF).flatMap(([ext, file]) => {
      const full = path.join(dir, `${prefix}${ext}`);
      return fs.existsSync(full) ? [[file, fs.readFileSync(full, 'utf8')]] : [];
    }),
  );
}

function webFailures(r: WebCheckResult): string[] {
  return [
    ...(r.runtimeError ? [`page: ${r.runtimeError}`] : []),
    ...(r.timedOut ? ['the checks timed out'] : []),
    ...(r.results.length === 0 && !r.runtimeError ? ['tests.js has no checks'] : []),
    ...r.results.filter((t) => !t.passed).map((t) => `check "${t.name}" fails: ${t.error ?? ''}`),
    ...r.ruleFailures.map((m) => `code rule: ${m}`),
  ];
}

/** Static checks of the folder, then (in Chromium) the solution passes every check and the starter does not. */
const checkWebTaskFolder: Checker<'web'> = async (dir, task) => {
  const errorsBefore = errors.length;
  fs.readdirSync(dir)
    .filter((name) => !WEB_TASK_FILES.has(name))
    .forEach((name) => fail(path.join(dir, name), 'unexpected file in a web task (learner files: starter.html / starter.css + solution.*, read-only: index.html / styles.css, checks: tests.js)'));
  const starter = readWebFiles(dir, 'starter.');
  const solution = readWebFiles(dir, 'solution.');
  const support: WebFiles = Object.fromEntries(WEB_FILES.flatMap((f) => (fs.existsSync(path.join(dir, f)) ? [[f, fs.readFileSync(path.join(dir, f), 'utf8')]] : [])));
  const testsFile = path.join(dir, 'tests.js');
  const tests = fs.existsSync(testsFile) ? fs.readFileSync(testsFile, 'utf8') : '';
  if (tests.trim() === '') fail(testsFile, 'missing or empty');
  const learnerNames = Object.keys(starter).sort();
  if (learnerNames.length === 0) fail(dir, 'a web task needs a learner file: starter.html and/or starter.css (+ solution.*)');
  if (learnerNames.join() !== Object.keys(solution).sort().join()) fail(dir, 'starter.* and solution.* files must come in pairs');
  WEB_FILES.filter((f) => f in starter && f in support).forEach((f) => fail(dir, `${f} is both a learner file (starter.*) and a read-only file`));
  const page: WebFiles = { ...support, ...solution };
  if (page['index.html'] === undefined) fail(dir, 'the page needs index.html (starter.html + solution.html, or a read-only index.html)');
  if (page['styles.css'] !== undefined && !linksStylesheet(page['index.html'] ?? '')) fail(dir, 'index.html of the solution does not link styles.css');
  if (learnerNames.every((f) => starter[f as WebFile]?.trim() === solution[f as WebFile]?.trim())) fail(dir, 'starter files are identical to the solution');
  task.codeRules.filter((r) => !isValidPattern(r.pattern, r.flags ?? 'im')).forEach((r) => fail(dir, `invalid code rule regex /${r.pattern}/`));
  task.codeRules.filter((r) => r.file && !(r.file in starter)).forEach((r) => fail(dir, `code rule for ${r.file}, which is not a learner file`));
  if (errors.length > errorsBefore) return;
  evaluateWebRules(solution, task.codeRules).forEach((m) => fail(dir, `solution breaks its own code rule: ${m}`));

  webRunner ??= startWebRunner(root);
  const started = await webRunner;
  if ('unavailable' in started) {
    webSkipped.push(dir);
    return;
  }
  const sol = await started.runner.check(solution, support, tests, task.viewport, task.codeRules);
  if (!sol.passed) fail(dir, `the solution does not pass:\n      ${webFailures(sol).join('\n      ')}`);
  const start = await started.runner.check(starter, support, tests, task.viewport, task.codeRules);
  if (start.passed) fail(dir, 'the starter already passes every check');
};

const CHECKS: { [K in Task['type']]: Checker<K> } = {
  python: checkPythonTask,
  web: checkWebTaskFolder,
  code: checkCode,
  quiz: checkQuiz,
  'value-set': checkValueSet,
  'test-case': checkTestCaseTask,
  'bug-report': checkBugReportTask,
  classify: checkClassify,
  order: checkOrder,
  written: checkWritten,
  table: checkTable,
  selector: checkSelectorTask,
  sql: checkSqlTask,
  playwright: checkPlaywrightTask,
  'tech-check': checkTechCheck,
};

/* ---------- structure ---------- */

interface FoundTask {
  dir: string;
  slug: string;
  task: Task;
}

function checkModuleFolder(moduleSlug: string, listed: Set<string>): void {
  const mDir = path.join(modulesDir, moduleSlug);
  if (!listed.has(moduleSlug)) fail(mDir, 'not listed in any content/courses/*.json');
  const moduleFile = path.join(mDir, 'module.json');
  if (!fs.existsSync(moduleFile)) {
    fail(moduleFile, 'missing');
    return;
  }
  const r = moduleSchema.safeParse(readJson(moduleFile));
  if (!r.success) fail(moduleFile, formatZodError(r.error));
}

function checkLessonFolder(lDir: string): FoundTask[] {
  const lessonFile = path.join(lDir, 'lesson.json');
  if (!fs.existsSync(lessonFile)) fail(lessonFile, 'missing');
  else {
    const r = lessonSchema.safeParse(readJson(lessonFile));
    if (!r.success) fail(lessonFile, formatZodError(r.error));
    else if (r.data.resources.some((res) => !res.needsVerification)) {
      warnings.push(`${rel(lessonFile)}: some resources are marked as verified — make sure a human checked them`);
    }
  }
  const md = path.join(lDir, 'lesson.md');
  if (!fs.existsSync(md) || fs.readFileSync(md, 'utf8').trim().length < MIN_THEORY_LENGTH) fail(md, 'missing or too short');

  const tasksDir = path.join(lDir, 'tasks');
  const found = dirs(tasksDir).flatMap((slug): FoundTask[] => {
    const dir = path.join(tasksDir, slug);
    const taskFile = path.join(dir, 'task.json');
    if (!fs.existsSync(taskFile)) {
      fail(taskFile, 'missing');
      return [];
    }
    const r = taskSchema.safeParse(readJson(taskFile));
    if (!r.success) {
      fail(taskFile, formatZodError(r.error));
      return [];
    }
    return [{ dir, slug, task: r.data }];
  });

  found
    .filter((t) => t.task.variantOf)
    .forEach((t) => {
      const main = found.find((m) => m.slug === t.task.variantOf);
      if (!main) fail(t.dir, `variantOf "${t.task.variantOf}" not found in this lesson`);
      else if (main.task.variantOf) fail(t.dir, 'variantOf must point to a main task, not another variant');
      else if (main.task.type !== t.task.type) fail(t.dir, `variant type "${t.task.type}" differs from main "${main.task.type}"`);
    });
  return found;
}

/** Validates every course outline and returns all module slugs the courses list. */
function checkCourses(): Set<string> {
  const files = fs.existsSync(coursesDir) ? fs.readdirSync(coursesDir).filter((f) => f.endsWith('.json')) : [];
  if (files.length === 0) fail(coursesDir, 'no course outlines found');
  const slugs = files.flatMap((f) => {
    const file = path.join(coursesDir, f);
    const r = courseSchema.safeParse(readJson(file));
    if (!r.success) {
      fail(file, formatZodError(r.error));
      return [];
    }
    const own = r.data.tracks.flatMap((t) => t.modules.map((m) => m.slug));
    duplicates(own).forEach((slug) => fail(file, `module "${slug}" is listed twice in this course`));
    return own;
  });
  return new Set(slugs);
}

async function main(): Promise<void> {
  const listed = checkCourses();

  const moduleSlugs = dirs(modulesDir);
  moduleSlugs.forEach((m) => checkModuleFolder(m, listed));
  const lessonDirs = moduleSlugs.flatMap((m) => dirs(path.join(modulesDir, m, 'lessons')).map((l) => path.join(modulesDir, m, 'lessons', l)));
  const tasks = lessonDirs.flatMap(checkLessonFolder);

  const playgroundIds = new Set(PLAYGROUND_PAGES.map((p) => p.id));
  tasks
    .map(({ dir, task }) => ({ dir, id: 'playground' in task ? task.playground : undefined }))
    .filter(({ id }) => id !== undefined && !playgroundIds.has(id))
    .forEach(({ dir, id }) => fail(dir, `unknown playground page "${id}"`));

  // One task at a time: code tasks use real timers (async lessons), and compiling other tasks
  // in parallel would block the event loop long enough to make timing-based tests flaky.
  await tasks.reduce<Promise<void>>(async (previous, { dir, task }) => {
    await previous;
    const check = CHECKS[task.type] as (d: string, t: Task) => void | Promise<void>;
    await check(dir, task);
  }, Promise.resolve());
  if (labChecks.length > 0) console.log(`Running ${labChecks.length} lab Python task(s) with pytest in lab/.venv…`);
  await runPool(labChecks, parallelism(), (check) => check());
  if (webRunner) {
    const started = await webRunner;
    if ('runner' in started) await started.runner.close();
    else warnings.push(`${webSkipped.length} web page task(s) were not run: ${started.unavailable} — run npm run lab:setup`);
  }
  if (labSkipped.length > 0) {
    warnings.push(`${labSkipped.length} lab Python task(s) (FastAPI…) were not run: ${labMissing ?? ''} — run npm run lab:python-setup`);
  }

  warnings.forEach((w) => console.log(`⚠  ${w}`));
  if (errors.length) {
    errors.forEach((e) => console.log(`✗  ${e}`));
    console.log(`\n${errors.length} error(s) in ${tasks.length} tasks.`);
    process.exit(1);
  }
  console.log(`✓ Content is valid: ${lessonDirs.length} lessons, ${tasks.length} tasks checked, every code task is solvable.`);
}

void main();
