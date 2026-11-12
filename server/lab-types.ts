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

/*
 * Bug marker that graded runs append to the browser / request user agent.
 * Matches "Mozilla/5.0 … Chrome/158 qa-lab-bugs=emailCase" (captures "emailCase"), rejects a user agent without it.
 * https://regex101.com/?regex=qa-lab-bugs%3D(%5BA-Za-z0-9%2C%5D%2B)
 */
const LAB_AGENT_MARKER = /qa-lab-bugs=([A-Za-z0-9,]+)/;

/** "none", a bug id or a comma list taken from the user agent; null when the request is not part of a graded run. */
export function labBugsFromUserAgent(userAgent: string | undefined): string | null {
  return LAB_AGENT_MARKER.exec(userAgent ?? '')?.[1] ?? null;
}

/** Turns on exactly the selected bugs (all off for "none"); without a selection the flags stay as they are. */
export function applyLabBugs<T extends Record<string, boolean>>(bugs: T, selection: string | null): T {
  if (selection === null) return bugs;
  const enabled = new Set(selection.split(','));
  return Object.fromEntries(Object.keys(bugs).map((id) => [id, enabled.has(id)])) as T;
}

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
