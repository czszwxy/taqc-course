import type { MutantSpec } from '../content/schema';
import type { CodeRule } from './client';
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

/** Starts loading Pyodide in the background (the first load takes a few seconds). */
export function warmUpPython(): void {
  void request('run', { 'warmup.py': 'pass\n' }, 'warmup.py');
}

export function runPythonProgram(code: string, support: Record<string, string>): Promise<PythonRunResult> {
  return request('run', { ...support, 'solution.py': code }, 'solution.py');
}

/** Drops "# comments" (outside string literals) so code rules only look at code. */
export function stripPythonComments(code: string): string {
  return code
    .split('\n')
    .map((line) => {
      const state = [...line].reduce<{ quote: string | null; cut: number }>(
        (acc, ch, i) => {
          if (acc.cut >= 0) return acc;
          if (acc.quote) return ch === acc.quote ? { ...acc, quote: null } : acc;
          if (ch === '"' || ch === "'") return { ...acc, quote: ch };
          return ch === '#' ? { ...acc, cut: i } : acc;
        },
        { quote: null, cut: -1 },
      );
      return state.cut >= 0 ? line.slice(0, state.cut) : line;
    })
    .join('\n');
}

export function evaluatePythonRules(code: string, rules: CodeRule[]): string[] {
  const clean = stripPythonComments(code);
  return rules
    .filter((r) => {
      // The pattern comes from task.json codeRules, e.g. "for\s+\w+\s+in" accepts "for item in items" and rejects "while True:".
      // Try one: https://regex101.com/?regex=for%5Cs%2B%5Cw%2B%5Cs%2Bin&testString=for%20item%20in%20items&flavor=javascript
      const found = new RegExp(r.pattern, r.flags ?? 'm').test(clean);
      return (r.kind === 'require' && !found) || (r.kind === 'forbid' && found);
    })
    .map((r) => r.message);
}

export interface PythonCheckResult extends PythonRunResult {
  passed: boolean;
  ruleFailures: string[];
}

const allPassed = (tests: PythonTestCase[]) => tests.length > 0 && tests.every((t) => t.passed);

/** Solution mode: the learner's solution.py against the hidden tests.py. */
export async function checkPythonSolution(code: string, tests: string, support: Record<string, string>, rules: CodeRule[]): Promise<PythonCheckResult> {
  const run = await request('test', { ...support, 'solution.py': code, 'tests.py': tests }, 'tests.py');
  const ruleFailures = evaluatePythonRules(code, rules);
  const passed = !run.error && !run.timedOut && allPassed(run.tests) && ruleFailures.length === 0;
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
): Promise<PythonSuiteResult> {
  const base = await request('test', { ...support, 'tests.py': tests }, 'tests.py');
  const ruleFailures = evaluatePythonRules(tests, rules);
  const tooFewTests = minTests !== undefined && base.tests.length < minTests;
  const green = !base.error && !base.timedOut && allPassed(base.tests);
  const mutants = green
    ? await specs.reduce<Promise<PythonMutantResult[]>>(async (accPromise, spec) => {
        const acc = await accPromise;
        const run = await request('test', { ...support, 'subject.py': mutantCode[spec.id] ?? '', 'tests.py': tests }, 'tests.py');
        const killed = Boolean(run.error) || Boolean(run.timedOut) || run.tests.some((t) => !t.passed);
        return [...acc, { id: spec.id, killed, description: spec.description, hint: spec.hint }];
      }, Promise.resolve([]))
    : [];
  const passed = green && !tooFewTests && ruleFailures.length === 0 && mutants.length === specs.length && mutants.every((m) => m.killed);
  return { ...base, passed, ruleFailures, tooFewTests, mutants };
}
