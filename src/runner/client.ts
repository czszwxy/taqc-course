import type { CompileDiagnostic, CompileResult } from './compiler';
import type { ExecOutput, TestResult, LogEntry } from './harness';
import { HARNESS_DTS } from './harness-dts';

export type { CompileDiagnostic, TestResult, LogEntry };

type CompileReply = CompileResult & { id: number; fatal?: string };

let compileWorker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (r: CompileReply) => void>();

function getCompileWorker(): Worker {
  if (!compileWorker) {
    compileWorker = new Worker(new URL('./compile.worker.ts', import.meta.url), { type: 'module' });
    compileWorker.onmessage = (e: MessageEvent<CompileReply>) => {
      const cb = pending.get(e.data.id);
      if (cb) {
        pending.delete(e.data.id);
        cb(e.data);
      }
    };
    compileWorker.onerror = (e) => {
      for (const [id, cb] of pending) cb({ id, diagnostics: [], outputs: {}, fatal: e.message || 'Compiler crashed' });
      pending.clear();
      compileWorker?.terminate();
      compileWorker = null;
    };
  }
  return compileWorker;
}

function compile(files: Record<string, string>): Promise<CompileReply> {
  const id = ++seq;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    getCompileWorker().postMessage({ id, files });
  });
}

/** Starts the compiler worker early so the first check is fast. */
export function warmUpCompiler(): void {
  void compile({ '/warmup.ts': 'export const ready: boolean = true;' });
}

function execute(modules: Record<string, string>, entry: string, collectTests: boolean, timeoutMs = 5000): Promise<ExecOutput> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./exec.worker.ts', import.meta.url), { type: 'module' });
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({ results: [], logs: [], timedOut: true });
    }, timeoutMs);
    worker.onmessage = (e: MessageEvent<ExecOutput>) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(e.data);
    };
    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ results: [], logs: [], runtimeError: e.message });
    };
    worker.postMessage({ modules, entry, collectTests });
  });
}

export interface CodeRule {
  kind: 'require' | 'forbid';
  pattern: string;
  flags?: string;
  message: string;
}

export interface CheckResult {
  passed: boolean;
  /** Type/syntax errors in the learner's file. */
  codeErrors: CompileDiagnostic[];
  /** Errors in the hidden tests file: usually a missing/misnamed export or a wrong signature. */
  interfaceErrors: CompileDiagnostic[];
  ruleFailures: string[];
  results: TestResult[];
  logs: LogEntry[];
  runtimeError?: string;
  timedOut?: boolean;
  fatal?: string;
}

export function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

export function evaluateCodeRules(code: string, rules: CodeRule[]): string[] {
  const clean = stripComments(code);
  const failures: string[] = [];
  for (const r of rules) {
    const re = new RegExp(r.pattern, r.flags ?? 'm');
    const found = re.test(clean);
    if ((r.kind === 'require' && !found) || (r.kind === 'forbid' && found)) failures.push(r.message);
  }
  return failures;
}

export async function checkCode(solution: string, tests: string, rules: CodeRule[] = []): Promise<CheckResult> {
  const c = await compile({ '/solution.ts': solution, '/tests.ts': tests, '/harness.d.ts': HARNESS_DTS });
  const base = { ruleFailures: evaluateCodeRules(solution, rules), results: [], logs: [] };
  if (c.fatal) return { ...base, passed: false, codeErrors: [], interfaceErrors: [], fatal: c.fatal };

  const errors = c.diagnostics.filter((d) => d.category === 'error');
  const codeErrors = errors.filter((d) => d.file === '/solution.ts' || d.file === '');
  const interfaceErrors = errors.filter((d) => d.file === '/tests.ts');

  const solutionJs = c.outputs['/solution.js'];
  const testsJs = c.outputs['/tests.js'];
  if (solutionJs === undefined || testsJs === undefined) {
    return { ...base, passed: false, codeErrors, interfaceErrors };
  }
  const run = await execute({ '/solution.js': solutionJs, '/tests.js': testsJs }, '/tests.js', true);
  const allTestsPass = run.results.length > 0 && run.results.every((r) => r.passed);
  const passed =
    allTestsPass && codeErrors.length === 0 && interfaceErrors.length === 0 && base.ruleFailures.length === 0 && !run.timedOut;
  return { ...base, ...run, passed, codeErrors, interfaceErrors };
}

export interface RunResult {
  codeErrors: CompileDiagnostic[];
  logs: LogEntry[];
  runtimeError?: string;
  timedOut?: boolean;
  fatal?: string;
}

/** Runs the learner's file on its own (no tests) and returns console output. */
export async function runCode(solution: string): Promise<RunResult> {
  const c = await compile({ '/solution.ts': solution, '/harness.d.ts': HARNESS_DTS });
  if (c.fatal) return { codeErrors: [], logs: [], fatal: c.fatal };
  const codeErrors = c.diagnostics.filter((d) => d.category === 'error' && d.file === '/solution.ts');
  const js = c.outputs['/solution.js'];
  if (js === undefined) return { codeErrors, logs: [] };
  const run = await execute({ '/solution.js': js }, '/solution.js', false);
  return { codeErrors, logs: run.logs, runtimeError: run.runtimeError, timedOut: run.timedOut };
}
