import { LAB_ROUTE, type LabLanguage, type LabRunResult, type LabStatus } from '../../../server/lab-types';

/** Talks to the Playwright lab runner mounted in the local dev server (server/lab-runner.ts). */

const NOT_AVAILABLE: LabStatus = {
  ready: false,
  message: 'The Playwright lab runs inside the local my-university server. Start the app with the launcher (or npm run dev) and reload this page.',
};

export async function fetchLabStatus(language: LabLanguage = 'typescript'): Promise<LabStatus> {
  try {
    const res = await fetch(`${LAB_ROUTE}/status?language=${language}`, { cache: 'no-store' });
    return res.ok ? ((await res.json()) as LabStatus) : NOT_AVAILABLE;
  } catch {
    return NOT_AVAILABLE;
  }
}

/** Runs the spec on the correct page and, for each bug id, on the page with only that bug turned on. */
export async function runInLab(code: string, bugs: string[], language: LabLanguage = 'typescript'): Promise<LabRunResult> {
  try {
    const res = await fetch(`${LAB_ROUTE}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, bugs, language }),
    });
    return (await res.json()) as LabRunResult;
  } catch (e) {
    return { ok: false, reason: 'error', message: `${NOT_AVAILABLE.message} (${e instanceof Error ? e.message : String(e)})` };
  }
}
