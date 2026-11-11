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
import { courseSchema, formatZodError, lessonSchema, moduleSchema, taskSchema, type Task } from '../src/content/schema';
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
const checkPlaywrightTask: Checker<'playwright'> = (dir, task) => {
  const read = (file: string): string | null => (fs.existsSync(path.join(dir, file)) ? fs.readFileSync(path.join(dir, file), 'utf8') : null);
  const starter = read('starter.ts');
  const solution = read('solution.ts');
  if (starter === null || solution === null) {
    fail(dir, 'playwright tasks need starter.ts and solution.ts');
    return;
  }
  if (!solution.includes("from '@playwright/test'")) fail(dir, "solution.ts must import test/expect from '@playwright/test'");
  if (starter.trim() === solution.trim()) fail(dir, 'starter.ts is identical to solution.ts');
  const page = PLAYGROUND_PAGES.find((p) => p.id === task.playground);
  const bugIds = page?.bugIds ?? [];
  duplicates(task.mutants.map((m) => m.id)).forEach((id) => fail(dir, `duplicate mutant id "${id}"`));
  task.mutants.filter((m) => !bugIds.includes(m.id)).forEach((m) => fail(dir, `mutant "${m.id}" is not a bug id of playground page "${task.playground}"`));
  const badRules = task.codeRules.filter((r) => !isValidPattern(r.pattern, r.flags ?? 'm'));
  badRules.forEach((r) => fail(dir, `invalid code rule regex /${r.pattern}/`));
  if (badRules.length === 0) evaluateCodeRules(solution, task.codeRules).forEach((m) => fail(dir, `solution.ts breaks its own code rule: ${m}`));
};

const CHECKS: { [K in Task['type']]: Checker<K> } = {
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
};

/* ---------- structure ---------- */

interface FoundTask {
  dir: string;
  slug: string;
  task: Task;
}

function checkModuleFolder(moduleSlug: string, listed: Set<string>): void {
  const mDir = path.join(modulesDir, moduleSlug);
  if (!listed.has(moduleSlug)) fail(mDir, 'not listed in content/course.json');
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

async function main(): Promise<void> {
  const course = courseSchema.safeParse(readJson(path.join(contentDir, 'course.json')));
  if (!course.success) fail(path.join(contentDir, 'course.json'), formatZodError(course.error));
  const listed = new Set(course.success ? course.data.tracks.flatMap((t) => t.modules.map((m) => m.slug)) : []);

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

  warnings.forEach((w) => console.log(`⚠  ${w}`));
  if (errors.length) {
    errors.forEach((e) => console.log(`✗  ${e}`));
    console.log(`\n${errors.length} error(s) in ${tasks.length} tasks.`);
    process.exit(1);
  }
  console.log(`✓ Content is valid: ${lessonDirs.length} lessons, ${tasks.length} tasks checked, every code task is solvable.`);
}

void main();
