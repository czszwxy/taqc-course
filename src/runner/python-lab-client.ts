import { LAB_ROUTE, type LabPythonJob, type LabPythonResponse, type LabStatus } from '../../server/lab-types';
import { IS_STATIC_SITE } from '../site';
import type { PythonRunResult } from './python-protocol';

/**
 * Python tasks with `"runtime": "lab"` (FastAPI, Django) run in the lab venv on the learner's computer,
 * through the dev server (server/lab-python-tasks.ts). On the website there is no lab.
 */

export const SITE_PYTHON_LAB_MESSAGE =
  'This task uses Python packages (FastAPI) that run only in the course on your computer, so on this website it cannot be checked. Write your code here if you like (the draft is saved in this browser), then check it in the course on your computer.';

const NOT_AVAILABLE =
  'Lab Python tasks run inside the local my-university server. Start the app with the launcher (or npm run dev) and reload this page.';

export async function fetchPythonLabStatus(): Promise<LabStatus> {
  if (IS_STATIC_SITE) return { ready: false, message: SITE_PYTHON_LAB_MESSAGE };
  try {
    const res = await fetch(`${LAB_ROUTE}/python/status`, { cache: 'no-store' });
    return res.ok ? ((await res.json()) as LabStatus) : { ready: false, message: NOT_AVAILABLE };
  } catch {
    return { ready: false, message: NOT_AVAILABLE };
  }
}

const unavailable = (jobs: readonly LabPythonJob[], message: string): PythonRunResult[] =>
  jobs.map(() => ({ error: null, tests: [], stdout: '', unavailable: message }));

/** Runs the jobs in the lab venv (a few at a time on the server); one result per job, in order. */
export async function runPythonLabJobs(jobs: readonly LabPythonJob[]): Promise<PythonRunResult[]> {
  if (IS_STATIC_SITE) return unavailable(jobs, SITE_PYTHON_LAB_MESSAGE);
  try {
    const res = await fetch(`${LAB_ROUTE}/python/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobs }),
    });
    const body = (await res.json()) as LabPythonResponse;
    return body.ok ? body.results : unavailable(jobs, body.message);
  } catch (e) {
    return unavailable(jobs, `${NOT_AVAILABLE} (${e instanceof Error ? e.message : String(e)})`);
  }
}
