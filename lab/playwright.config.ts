import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import { LAB_BASE_URL } from '../server/lab-types';

/**
 * Playwright config of the QA Academy lab.
 *  - `npm run lab` (or `npx playwright test -c lab`): runs your own practice tests from lab/tests against the
 *    Bug Playground pages of the running app (they start the dev server themselves if it is not running).
 *  - The in-app grader (server/lab-runner.ts) sets QA_LAB_RUN_DIR: then the tests come from that folder and every
 *    page variant (correct page + one per bug) is a separate project.
 */

/** A healthy test on these local pages takes about a second; generous limits keep slow machines green. */
const TEST_TIMEOUT_MS = 15_000;
const EXPECT_TIMEOUT_MS = 3_000;
const ACTION_TIMEOUT_MS = 5_000;

interface RunPlan {
  /** bugs = "none" or one bug id; the playground pages read it from the user agent (withLabMode). */
  projects: { name: string; bugs: string }[];
  reportFile: string;
}

/**
 * Browsers installed into the project (`npm run lab:setup` → lab/.browsers) win over the default per-user folder.
 * Test workers inherit process.env, so setting it here applies to every browser this run launches.
 */
const localBrowsers = fileURLToPath(new URL('./.browsers', import.meta.url));
if (!process.env['PLAYWRIGHT_BROWSERS_PATH'] && fs.existsSync(localBrowsers)) process.env['PLAYWRIGHT_BROWSERS_PATH'] = localBrowsers;

const runDir = process.env['QA_LAB_RUN_DIR'];
const plan: RunPlan | null = runDir ? (JSON.parse(fs.readFileSync(path.join(runDir, 'plan.json'), 'utf8')) as RunPlan) : null;
const chrome = devices['Desktop Chrome'];

/** Next to this config (lab/playwright-report), whatever folder the command was started from. */
const htmlReportDir = fileURLToPath(new URL('./playwright-report', import.meta.url));

const reporter: ReporterDescription[] = plan
  ? [['json', { outputFile: plan.reportFile }]]
  : [['list'], ['html', { open: 'never', outputFolder: htmlReportDir }]];

export default defineConfig({
  testDir: runDir ?? './tests',
  outputDir: runDir ? path.join(runDir, 'output') : './test-results',
  timeout: TEST_TIMEOUT_MS,
  expect: { timeout: EXPECT_TIMEOUT_MS },
  fullyParallel: true,
  retries: 0,
  reporter,
  use: {
    baseURL: LAB_BASE_URL,
    actionTimeout: ACTION_TIMEOUT_MS,
    trace: plan ? 'off' : 'retain-on-failure',
    screenshot: plan ? 'off' : 'only-on-failure',
  },
  // Graded runs: every page variant shares one baseline folder, so screenshots of the correct page are the reference.
  ...(plan ? { snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}' } : {}),
  projects: plan
    ? plan.projects.map((p) => ({ name: p.name, use: { ...chrome, userAgent: `${chrome.userAgent} qa-lab-bugs=${p.bugs}` } }))
    : [{ name: 'chromium', use: { ...chrome } }],
  webServer: {
    command: 'npm run dev',
    url: LAB_BASE_URL,
    reuseExistingServer: true,
  },
});
