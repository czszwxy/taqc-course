/**
 * Validates all course content and proves every task is solvable:
 *  - JSON files match the schemas (src/content/schema.ts)
 *  - code tasks: solution compiles with 0 errors and passes all tests; starter does NOT pass
 *  - test-case / written tasks: the model answer passes the task's own rules
 *  - bug-report tasks: each model report passes quality checks and is matched to its own bug
 *  - value-set tasks: generator exists and accepts its own expected answer for several seeds
 *  - quiz / classify / order: structural sanity (one correct option, known categories, unique items…)
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

const checkCode: Checker<'code'> = async (dir, task) => {
  const files = ['starter.ts', 'solution.ts', 'tests.ts'].map((f) => path.join(dir, f));
  const missing = files.filter((f) => !fs.existsSync(f));
  missing.forEach((f) => fail(f, 'missing'));
  if (missing.length) return;
  const [starter, solution, tests] = files.map((f) => fs.readFileSync(f, 'utf8'));

  const evaluate = async (code: string) => {
    const c = compile({ '/solution.ts': code, '/tests.ts': tests, '/harness.d.ts': HARNESS_DTS });
    const errs = c.diagnostics.filter((d) => d.category === 'error');
    const run = await executeModules({
      modules: { '/solution.js': c.outputs['/solution.js'] ?? '', '/tests.js': c.outputs['/tests.js'] ?? '' },
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

  await Promise.all(
    tasks.map(({ dir, task }) => {
      const check = CHECKS[task.type] as (d: string, t: Task) => void | Promise<void>;
      return check(dir, task);
    }),
  );

  warnings.forEach((w) => console.log(`⚠  ${w}`));
  if (errors.length) {
    errors.forEach((e) => console.log(`✗  ${e}`));
    console.log(`\n${errors.length} error(s) in ${tasks.length} tasks.`);
    process.exit(1);
  }
  console.log(`✓ Content is valid: ${lessonDirs.length} lessons, ${tasks.length} tasks checked, every code task is solvable.`);
}

void main();
