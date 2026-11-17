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

export function runPythonProgram(code: string, support: Record<string, string>, runtime: PythonRuntime = 'browser'): Promise<PythonRunResult> {
  return runJob(runtime, { kind: 'run', files: { ...support, 'solution.py': code }, entry: 'solution.py' });
}

export interface PythonCheckResult extends PythonRunResult {
  passed: boolean;
  ruleFailures: string[];
}

const allPassed = (tests: PythonTestCase[]) => tests.length > 0 && tests.every((t) => t.passed);

/** Solution mode: the learner's solution.py against the hidden tests.py. */
export async function checkPythonSolution(
  code: string,
  tests: string,
  support: Record<string, string>,
  rules: CodeRule[],
  runtime: PythonRuntime = 'browser',
): Promise<PythonCheckResult> {
  const run = await runJob(runtime, { kind: 'test', files: { ...support, 'solution.py': code, 'tests.py': tests }, entry: 'tests.py' });
  const ruleFailures = evaluatePythonRules(code, rules);
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
 * Tests mode: the learner's tests.py must pass on subject.py (a support file) and fail on every
 * mutants/<id>.py (a copy of subject.py with one bug).
 */
export async function checkPythonTests(
  tests: string,
  support: Record<string, string>,
  mutantCode: Record<string, string>,
  specs: MutantSpec[],
  minTests: number | undefined,
  rules: CodeRule[],
  runtime: PythonRuntime = 'browser',
): Promise<PythonSuiteResult> {
  const testJob = (subject: Record<string, string>): LabPythonJob => ({ kind: 'test', files: { ...support, ...subject, 'tests.py': tests }, entry: 'tests.py' });
  const base = await runJob(runtime, testJob({}));
  const ruleFailures = evaluatePythonRules(tests, rules);
  const tooFewTests = minTests !== undefined && base.tests.length < minTests;
  const green = !base.error && !base.timedOut && !base.unavailable && allPassed(base.tests);
  const runs = green ? await runJobs(runtime, specs.map((spec) => testJob({ 'subject.py': mutantCode[spec.id] ?? '' }))) : [];
  const mutants = runs.map((run, i): PythonMutantResult => {
    const spec = specs[i] as MutantSpec;
    const killed = !run.unavailable && (Boolean(run.error) || Boolean(run.timedOut) || run.tests.some((t) => !t.passed));
    return { id: spec.id, killed, description: spec.description, hint: spec.hint };
  });
  const passed = green && !tooFewTests && ruleFailures.length === 0 && mutants.length === specs.length && mutants.every((m) => m.killed);
  return { ...base, passed, ruleFailures, tooFewTests, mutants };
}
