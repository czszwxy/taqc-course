/**
 * Playwright lab: types and constants shared by the dev-server runner (server/lab-runner.ts),
 * the lab config (lab/playwright.config.ts) and the app (src/features/playwright).
 */

/** Dev-server route of the runner (Vite strips it from req.url inside the middleware). */
export const LAB_ROUTE = '/__lab';

/** The app's own origin: the Bug Playground pages the tests open. Same fixed port as DEV_PORT in vite.config.ts. */
export const LAB_BASE_URL = 'http://localhost:5173';

/** Legacy localStorage fallback for withLabMode(); graded runs put "qa-lab-bugs=<none|bugId>" into the user agent instead. */
export const LAB_BUGS_KEY = 'qa-lab:bugs';
export const LAB_NO_BUGS = 'none';

/** Project (page variant) names in a graded run. */
export const LAB_CORRECT_PROJECT = 'correct';
export const LAB_BUG_PREFIX = 'bug:';

export interface LabRunRequest {
  /** The learner's spec file. */
  code: string;
  /** Bug ids to run against — one extra project per bug, next to the correct page. Empty = correct page only. */
  bugs: string[];
}

export type LabTestStatus = 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';

export interface LabTestResult {
  /** "describe › test" title. */
  title: string;
  status: LabTestStatus;
  durationMs: number;
  error?: string;
}

export interface LabProjectResult {
  name: string;
  /** null for the correct page. */
  bug: string | null;
  tests: LabTestResult[];
}

export type LabRunResult =
  | { ok: true; projects: LabProjectResult[]; errors: string[]; durationMs: number }
  | { ok: false; reason: 'setup' | 'busy' | 'error'; message: string };

export interface LabStatus {
  ready: boolean;
  message: string;
}
