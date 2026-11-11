/**
 * Proves every Playwright task is solvable and not solved by its starter — with the REAL Playwright runner:
 *  - solution.ts is green on the correct page and catches every mutant (bug) of the task;
 *  - starter.ts does NOT pass.
 * Needs Chromium (`npm run lab:setup`) and starts the dev server itself if it is not running.
 *
 * Run: npm run validate:lab            (all Playwright tasks)
 *      npm run validate:lab -- 15-     (only task ids containing "15-")
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { taskSchema, type PlaywrightTask } from '../src/content/schema';
import { gradeLabRun } from '../src/features/playwright/grade';
import { runLab } from '../server/lab-runner';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modulesDir = path.join(root, 'content', 'modules');
const filter = process.argv[2] ?? '';

const subdirs = (p: string): string[] => (fs.existsSync(p) ? fs.readdirSync(p).filter((d) => fs.statSync(path.join(p, d)).isDirectory()).sort() : []);

interface LabTask {
  id: string;
  dir: string;
  task: PlaywrightTask;
}

function findPlaywrightTasks(): LabTask[] {
  return subdirs(modulesDir).flatMap((m) =>
    subdirs(path.join(modulesDir, m, 'lessons')).flatMap((l) =>
      subdirs(path.join(modulesDir, m, 'lessons', l, 'tasks')).flatMap((t): LabTask[] => {
        const dir = path.join(modulesDir, m, 'lessons', l, 'tasks', t);
        const file = path.join(dir, 'task.json');
        if (!fs.existsSync(file)) return [];
        const parsed = taskSchema.safeParse(JSON.parse(fs.readFileSync(file, 'utf8')));
        return parsed.success && parsed.data.type === 'playwright' ? [{ id: `${m}/${l}/${t}`, dir, task: parsed.data }] : [];
      }),
    ),
  );
}

async function checkTask({ id, dir, task }: LabTask): Promise<string[]> {
  const solution = fs.readFileSync(path.join(dir, 'solution.ts'), 'utf8');
  const starter = fs.readFileSync(path.join(dir, 'starter.ts'), 'utf8');
  const bugs = task.mutants.map((m) => m.id);

  const solutionRun = await runLab(root, { code: solution, bugs });
  if (!solutionRun.ok) return [`${id}: solution run failed — ${solutionRun.message}`];
  const graded = gradeLabRun(task, solution, solutionRun);
  const problems = [
    ...graded.errors.map((e) => `${id}: solution.ts does not load — ${e}`),
    ...graded.correct.filter((t) => t.status !== 'passed').map((t) => `${id}: reference test "${t.title}" fails on the correct page — ${t.error ?? t.status}`),
    ...graded.mutants.filter((m) => !m.caught).map((m) => `${id}: reference tests do not catch mutant "${m.id}"`),
    ...graded.ruleFailures.map((r) => `${id}: solution.ts breaks a code rule — ${r}`),
    ...(graded.tooFewTests ? [`${id}: solution.ts has fewer than minTests tests`] : []),
  ];

  const starterRun = await runLab(root, { code: starter, bugs });
  const starterPasses = starterRun.ok && gradeLabRun(task, starter, starterRun).passed;
  return starterPasses ? [...problems, `${id}: starter.ts already passes — the task is solved before the learner starts`] : problems;
}

async function main(): Promise<void> {
  const tasks = findPlaywrightTasks().filter((t) => t.id.includes(filter));
  console.log(`Running ${tasks.length} Playwright task(s) in real Chromium…`);
  const problems = await tasks.reduce<Promise<string[]>>(async (acc, t) => {
    const done = await acc;
    const started = Date.now();
    const found = await checkTask(t);
    console.log(`${found.length === 0 ? '✓' : '✗'} ${t.id} (${Date.now() - started} ms)`);
    return [...done, ...found];
  }, Promise.resolve([]));
  problems.forEach((p) => console.error(`✗  ${p}`));
  if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s) in ${tasks.length} Playwright task(s).`);
    process.exit(1);
  }
  console.log(`\n✓ All ${tasks.length} Playwright task(s) are solvable and their starters do not pass.`);
}

await main();
