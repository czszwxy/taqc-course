import type { MutantSpec } from '../content/schema';
import type { CodeRule } from './client';
import { evaluatePythonRules } from './python-rules';
import type { LabPythonJob } from '../../server/lab-types';
import { runPythonLabJobs } from './python-lab-client';
import type { PythonJob, PythonRunResult, PythonTestCase, PythonWorkerMessage } from './python-protocol';

/*
 * Main-thread API for Python tasks. One worker keeps Pyodide loaded between runs; a run that exceeds
 * the time limit (an infinite loop) terminates the worker and the next run starts a fresh one.
 */

/** Learner code gets this long per run, counted after Python has loaded. */
export const PYTHON_RUN_TIMEOUT_MS = 5000;

let worker: Worker | null = null;
let nextJobId = 0;

function getWorker(): Worker {
  worker ??= new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' });
  return worker;
}

function stopWorker(): void {
  worker?.terminate();
  worker = null;
}

function request(kind: PythonJob['kind'], files: Record<string, string>, entry: string): Promise<PythonRunResult> {
  return new Promise((resolve) => {
    const w = getWorker();
    nextJobId += 1;
    const id = nextJobId;
    let timer: number | undefined;
    const onMessage = (event: MessageEvent<PythonWorkerMessage>) => {
      const msg = event.data;
      if (msg.id !== id) return;
      if (msg.type === 'started') {
        timer = window.setTimeout(() => {
          w.removeEventListener('message', onMessage);
          stopWorker();
          resolve({ error: null, tests: [], stdout: '', timedOut: true });
        }, PYTHON_RUN_TIMEOUT_MS);
        return;
      }
      window.clearTimeout(timer);
      w.removeEventListener('message', onMessage);
      resolve(msg.result);
    };
    w.addEventListener('message', onMessage);
    const job: PythonJob = { id, kind, files, entry };
    w.postMessage(job);
  });
}

export { evaluatePythonRules, stripPythonComments } from './python-rules';

/** browser = Pyodide in a worker (default); lab = real CPython in lab/.venv through the dev server (FastAPI, Django). */
export type PythonRuntime = 'browser' | 'lab';

/** Runs jobs in order and returns one result per job: one at a time in the worker, a few in parallel in the lab. */
async function runJobs(runtime: PythonRuntime, jobs: LabPythonJob[]): Promise<PythonRunResult[]> {
  if (runtime === 'lab') return runPythonLabJobs(jobs);
  return jobs.reduce<Promise<PythonRunResult[]>>(async (accPromise, job) => {
    const acc = await accPromise;
    return [...acc, await request(job.kind, job.files, job.entry)];
  }, Promise.resolve([]));
}

async function runJob(runtime: PythonRuntime, job: LabPythonJob): Promise<PythonRunResult> {
  const [result] = await runJobs(runtime, [job]);
  return result ?? { error: 'No result from the Python runner.', tests: [], stdout: '' };
}

/** Starts loading Pyodide in the background (the first load takes a few seconds). */
export function warmUpPython(): void {
  void request('run', { 'warmup.py': 'pass\n' }, 'warmup.py');
}

/** Where a task runs and where its files go (lab tasks may use a project layout such as shop/views.py). */
export interface PythonTaskLayout {
  runtime?: PythonRuntime;
  /** The learner's file: solution.py (solution mode) / tests.py (tests mode) unless the task names another one. */
  file?: string;
  /** Tests mode: the file under test that each mutant replaces. */
  subject?: string;
}

const SOLUTION_FILE = 'solution.py';
const TESTS_FILE = 'tests.py';
const SUBJECT_FILE = 'subject.py';

export function runPythonProgram(code: string, support: Record<string, string>, layout: PythonTaskLayout = {}): Promise<PythonRunResult> {
  const file = layout.file ?? SOLUTION_FILE;
  return runJob(layout.runtime ?? 'browser', { kind: 'run', files: { ...support, [file]: code }, entry: file });
}

export interface PythonCheckResult extends PythonRunResult {
  passed: boolean;
  ruleFailures: string[];
}

const allPassed = (tests: PythonTestCase[]) => tests.length > 0 && tests.every((t) => t.passed);

/** Solution mode: the learner's solution.py (or the task's own file) against the hidden tests.py. */
export async function checkPythonSolution(
  code: string,
  tests: string,
  support: Record<string, string>,
  rules: CodeRule[],
  layout: PythonTaskLayout = {},
): Promise<PythonCheckResult> {
  const files = { ...support, [layout.file ?? SOLUTION_FILE]: code, [TESTS_FILE]: tests };
  const run = await runJob(layout.runtime ?? 'browser', { kind: 'test', files, entry: TESTS_FILE });
  const ruleFailures = evaluatePythonRules(code, rules, layout.file);
  const passed = !run.error && !run.timedOut && !run.unavailable && allPassed(run.tests) && ruleFailures.length === 0;
  return { ...run, passed, ruleFailures };
}

export interface PythonMutantResult {
  id: string;
  killed: boolean;
  description: string;
  hint: string;
}

export interface PythonSuiteResult extends PythonRunResult {
  passed: boolean;
  ruleFailures: string[];
  tooFewTests: boolean;
  mutants: PythonMutantResult[];
}

/**
 * Tests mode: the learner's tests.py must pass on subject.py (a support file; a lab task may name another one,
 * e.g. shop/views.py) and fail on every mutants/<id>.py (a copy of that file with one bug).
 */
export async function checkPythonTests(
  tests: string,
  support: Record<string, string>,
  mutantCode: Record<string, string>,
  specs: MutantSpec[],
  minTests: number | undefined,
  rules: CodeRule[],
  layout: PythonTaskLayout = {},
): Promise<PythonSuiteResult> {
  const runtime = layout.runtime ?? 'browser';
  const testsFile = layout.file ?? TESTS_FILE;
  const subjectFile = layout.subject ?? SUBJECT_FILE;
  const testJob = (subject: Record<string, string>): LabPythonJob => ({ kind: 'test', files: { ...support, ...subject, [testsFile]: tests }, entry: testsFile });
  const base = await runJob(runtime, testJob({}));
  const ruleFailures = evaluatePythonRules(tests, rules);
  const tooFewTests = minTests !== undefined && base.tests.length < minTests;
  const green = !base.error && !base.timedOut && !base.unavailable && allPassed(base.tests);
  const runs = green ? await runJobs(runtime, specs.map((spec) => testJob({ [subjectFile]: mutantCode[spec.id] ?? '' }))) : [];
  const mutants = runs.map((run, i): PythonMutantResult => {
    const spec = specs[i] as MutantSpec;
    const killed = !run.unavailable && (Boolean(run.error) || Boolean(run.timedOut) || run.tests.some((t) => !t.passed));
    return { id: spec.id, killed, description: spec.description, hint: spec.hint };
  });
  const passed = green && !tooFewTests && ruleFailures.length === 0 && mutants.length === specs.length && mutants.every((m) => m.killed);
  return { ...base, passed, ruleFailures, tooFewTests, mutants };
}
