import type { CompileDiagnostic, CompileResult } from './compiler';
import type { ExecOutput, ExecRequest, TestResult } from './harness';
import { HARNESS_DTS } from './harness-dts';

/**
 * Checking for "write the tests" code tasks (mutation testing), shared by the app and the validator.
 * The learner's tests must (1) compile, (2) pass on the correct subject.ts and (3) FAIL on every mutant —
 * a broken copy of subject.ts. A mutant the tests don't notice "survives" and gets a hint.
 */

export const SUBJECT_FILE = 'subject.ts';
const SUBJECT_JS = '/subject.js';
const TESTS_PATH = '/tests.ts';
const TESTS_JS = '/tests.js';

export interface MutantInfo {
  id: string;
  description: string;
  hint: string;
}

export interface MutantResult extends MutantInfo {
  killed: boolean;
}

export interface SuiteDeps {
  compile(files: Record<string, string>): Promise<CompileResult>;
  execute(req: ExecRequest): Promise<ExecOutput>;
}

export interface SuiteInput {
  tests: string;
  support: Record<string, string>;
  mutantCode: Record<string, string>;
  mutants: MutantInfo[];
  minTests?: number;
}

export interface SuiteResult {
  passed: boolean;
  codeErrors: CompileDiagnostic[];
  results: TestResult[];
  logs: ExecOutput['logs'];
  runtimeError?: string;
  timedOut?: boolean;
  tooFewTests: boolean;
  /** Empty until the tests are green on the correct code. */
  mutants: MutantResult[];
}

const toPaths = (files: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(files).map(([name, code]) => [`/${name}`, code]));

const jsOutputs = (c: CompileResult): Record<string, string> =>
  Object.fromEntries(Object.entries(c.outputs).filter(([p]) => p.endsWith('.js')));

function isKilled(run: ExecOutput): boolean {
  return Boolean(run.timedOut || run.runtimeError) || run.results.length === 0 || run.results.some((r) => !r.passed);
}

export async function evaluateTestSuite(deps: SuiteDeps, input: SuiteInput): Promise<SuiteResult> {
  const compiled = await deps.compile({ ...toPaths(input.support), [TESTS_PATH]: input.tests, '/harness.d.ts': HARNESS_DTS });
  const codeErrors = compiled.diagnostics.filter((d) => d.category === 'error' && (d.file === TESTS_PATH || d.file === ''));
  const empty = { results: [], logs: [], tooFewTests: false, mutants: [] };
  if (codeErrors.length > 0 || compiled.outputs[TESTS_JS] === undefined) return { ...empty, passed: false, codeErrors };

  const modules = jsOutputs(compiled);
  const run = await deps.execute({ modules, entry: TESTS_JS, collectTests: true });
  const tooFewTests = run.results.length < (input.minTests ?? 1);
  const greenOnSubject = !run.timedOut && !run.runtimeError && run.results.length > 0 && run.results.every((r) => r.passed);
  const base = { codeErrors, results: run.results, logs: run.logs, runtimeError: run.runtimeError, timedOut: run.timedOut, tooFewTests };
  if (!greenOnSubject) return { ...base, passed: false, mutants: [] };

  const mutants = await Promise.all(
    input.mutants.map(async (m): Promise<MutantResult> => {
      const code = input.mutantCode[m.id] ?? '';
      const mc = await deps.compile({ ...toPaths(input.support), [`/${SUBJECT_FILE}`]: code, '/harness.d.ts': HARNESS_DTS });
      const subjectJs = mc.outputs[SUBJECT_JS];
      if (subjectJs === undefined) return { ...m, killed: true };
      const mutantRun = await deps.execute({ modules: { ...modules, [SUBJECT_JS]: subjectJs }, entry: TESTS_JS, collectTests: true });
      return { ...m, killed: isKilled(mutantRun) };
    }),
  );
  return { ...base, passed: !tooFewTests && mutants.every((m) => m.killed), mutants };
}
