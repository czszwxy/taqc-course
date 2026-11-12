/** Messages between the main thread (python-client.ts) and the Python worker (python.worker.ts). */

export interface PythonJob {
  id: number;
  /** "test" runs test_* functions of `entry`; "run" executes `entry` as a program. */
  kind: 'test' | 'run';
  /** File name → source; written to the task folder before the run. */
  files: Record<string, string>;
  entry: string;
}

export interface PythonTestCase {
  name: string;
  passed: boolean;
  error: string;
  /** The test function's docstring — shown when the test fails. */
  hint: string;
}

/** Result of qa_runner.run_tests / run_program (tests is empty for programs). */
export interface PythonRunResult {
  /** Problem before any test could run: a syntax error, a failed import, a crash at module level. */
  error: string | null;
  tests: PythonTestCase[];
  stdout: string;
  timedOut?: boolean;
}

export type PythonWorkerMessage = { id: number; type: 'started' } | { id: number; type: 'done'; result: PythonRunResult };
