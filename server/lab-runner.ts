import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  LAB_BASE_URL,
  LAB_BUG_PREFIX,
  LAB_BUGS_KEY,
  LAB_CORRECT_PROJECT,
  LAB_NO_BUGS,
  type LabProjectResult,
  type LabRunRequest,
  type LabRunResult,
  type LabStatus,
  type LabTestResult,
  type LabTestStatus,
} from './lab-types';

/**
 * Runs a learner's Playwright spec with the REAL @playwright/test runner (Chromium) against the Bug Playground:
 * once on the correct page and once per requested bug (each bug = its own Playwright project whose storageState
 * sets LAB_BUGS_KEY). Used by the dev server (POST /__lab/run) and by scripts/validate-lab.ts.
 */

const LAB_DIR = 'lab';
const RUNS_DIR = '.runs';
const SPEC_FILE = 'learner.spec.ts';
const PLAN_FILE = 'plan.json';
const REPORT_FILE = 'report.json';
const CONFIG_FILE = 'playwright.config.ts';

/** A whole graded run (all page variants) must finish within this time. */
const RUN_TIMEOUT_MS = 120_000;
const MAX_BODY_BYTES = 200_000;
const MAX_BUGS_PER_RUN = 12;
const MAX_ERROR_CHARS = 3_000;
const OUTPUT_TAIL_CHARS = 2_000;

const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_FORBIDDEN = 403;
const HTTP_SERVER_ERROR = 500;
const MS_PER_SECOND = 1000;

export const LAB_SETUP_MESSAGE =
  'Chromium for Playwright is not installed yet. Run this once in a terminal in the project folder: npm run lab:setup — then press Check again.';

/** Project-local browser folder (installed by `npm run lab:setup`); lab/playwright.config.ts prefers it. */
export function labBrowsersDir(root: string): string {
  return path.join(root, LAB_DIR, '.browsers');
}

function hasLocalChromium(root: string): boolean {
  const dir = labBrowsersDir(root);
  return fs.existsSync(dir) && fs.readdirSync(dir).some((name) => name.startsWith('chromium'));
}

interface PlanProject {
  name: string;
  storageState: string;
}

/** Contract with lab/playwright.config.ts (read via QA_LAB_RUN_DIR). */
export interface LabPlan {
  projects: PlanProject[];
  reportFile: string;
}

function storageState(bugs: string): object {
  return { cookies: [], origins: [{ origin: LAB_BASE_URL, localStorage: [{ name: LAB_BUGS_KEY, value: bugs }] }] };
}

function writeRun(runDir: string, request: LabRunRequest): LabPlan {
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, SPEC_FILE), request.code);
  const variants = [{ name: LAB_CORRECT_PROJECT, bugs: LAB_NO_BUGS }, ...request.bugs.map((bug) => ({ name: LAB_BUG_PREFIX + bug, bugs: bug }))];
  const projects = variants.map((v, i) => {
    const file = path.join(runDir, `state-${i}.json`);
    fs.writeFileSync(file, JSON.stringify(storageState(v.bugs)));
    return { name: v.name, storageState: file };
  });
  const plan: LabPlan = { projects, reportFile: path.join(runDir, REPORT_FILE) };
  fs.writeFileSync(path.join(runDir, PLAN_FILE), JSON.stringify(plan));
  return plan;
}

interface ProcessOutcome {
  output: string;
  timedOut: boolean;
}

function runPlaywright(root: string, runDir: string): Promise<ProcessOutcome> {
  const cli = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');
  const args = [cli, 'test', '--config', path.join(root, LAB_DIR, CONFIG_FILE)];
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      env: { ...process.env, QA_LAB_RUN_DIR: runDir, FORCE_COLOR: '0' },
      windowsHide: true,
    });
    const chunks: string[] = [];
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, RUN_TIMEOUT_MS);
    child.stdout.on('data', (d: Buffer) => chunks.push(d.toString()));
    child.stderr.on('data', (d: Buffer) => chunks.push(d.toString()));
    child.on('error', (e) => chunks.push(String(e)));
    child.on('close', () => {
      clearTimeout(timer);
      resolve({ output: chunks.join(''), timedOut });
    });
  });
}

/* ---------- JSON report → results ---------- */

interface JsonError {
  message?: string;
}
interface JsonResult {
  status?: LabTestStatus;
  duration?: number;
  error?: JsonError;
  errors?: JsonError[];
}
interface JsonTest {
  projectName: string;
  results: JsonResult[];
}
interface JsonSpec {
  title: string;
  tests: JsonTest[];
}
interface JsonSuite {
  title: string;
  specs?: JsonSpec[];
  suites?: JsonSuite[];
}
interface JsonReport {
  suites?: JsonSuite[];
  errors?: JsonError[];
}

/*
 * ANSI colour codes in Playwright messages: matches "\u001b[31m" / "\u001b[2m", rejects plain "[31m".
 * https://regex101.com/?regex=%5Cu001b%5C%5B%5B0-9%3B%5D*m&flags=g
 */
const ANSI = /\u001b\[[0-9;]*m/g;

function cleanMessage(message: string): string {
  const text = message.replace(ANSI, '').trim();
  return text.length > MAX_ERROR_CHARS ? `${text.slice(0, MAX_ERROR_CHARS)}\n…` : text;
}

interface NamedSpec {
  title: string;
  spec: JsonSpec;
}

/** describe() blocks become title prefixes; the top-level suite is the file itself and is skipped. */
function flattenSpecs(suites: JsonSuite[], prefix: string[]): NamedSpec[] {
  return suites.flatMap((suite) => {
    const titles = suite.title && suite.title !== SPEC_FILE ? [...prefix, suite.title] : prefix;
    return [
      ...(suite.specs ?? []).map((spec) => ({ title: [...titles, spec.title].join(' › '), spec })),
      ...flattenSpecs(suite.suites ?? [], titles),
    ];
  });
}

function toTestResult(title: string, test: JsonTest): LabTestResult {
  const last = test.results.at(-1);
  const message = last?.error?.message ?? last?.errors?.[0]?.message;
  return {
    title,
    status: last?.status ?? 'skipped',
    durationMs: last?.duration ?? 0,
    ...(message ? { error: cleanMessage(message) } : {}),
  };
}

function toProjects(report: JsonReport, plan: LabPlan): LabProjectResult[] {
  const specs = flattenSpecs(report.suites ?? [], []);
  return plan.projects.map(({ name }) => ({
    name,
    bug: name.startsWith(LAB_BUG_PREFIX) ? name.slice(LAB_BUG_PREFIX.length) : null,
    tests: specs.flatMap(({ title, spec }) => spec.tests.filter((t) => t.projectName === name).map((t) => toTestResult(title, t))),
  }));
}

function needsSetup(output: string): boolean {
  return output.includes("Executable doesn't exist") || output.includes('npx playwright install');
}

/** Runs one graded lab run. Never throws. */
export async function runLab(root: string, request: LabRunRequest): Promise<LabRunResult> {
  const started = Date.now();
  const runDir = path.join(root, LAB_DIR, RUNS_DIR, randomUUID());
  try {
    const plan = writeRun(runDir, request);
    const { output, timedOut } = await runPlaywright(root, runDir);
    if (timedOut) return { ok: false, reason: 'error', message: `The run took longer than ${RUN_TIMEOUT_MS / MS_PER_SECOND} s and was stopped. Look for a test that waits forever.` };
    if (needsSetup(output)) {
      const detail = output.split('\n').find((line) => line.includes("Executable doesn't exist")) ?? '';
      return { ok: false, reason: 'setup', message: `${LAB_SETUP_MESSAGE}\n${cleanMessage(detail)}`.trim() };
    }
    if (!fs.existsSync(plan.reportFile)) {
      return { ok: false, reason: 'error', message: `Playwright did not produce a report:\n${cleanMessage(output.slice(-OUTPUT_TAIL_CHARS))}` };
    }
    const report = JSON.parse(fs.readFileSync(plan.reportFile, 'utf8')) as JsonReport;
    const errors = (report.errors ?? []).map((e) => cleanMessage(e.message ?? 'Unknown error'));
    return { ok: true, projects: toProjects(report, plan), errors, durationMs: Date.now() - started };
  } catch (e) {
    return { ok: false, reason: 'error', message: e instanceof Error ? e.message : String(e) };
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
}

export async function labStatus(root: string): Promise<LabStatus> {
  if (hasLocalChromium(root)) return { ready: true, message: 'Playwright and Chromium (lab/.browsers) are installed.' };
  try {
    const { chromium } = await import('@playwright/test');
    const executable = chromium.executablePath();
    return fs.existsSync(executable)
      ? { ready: true, message: 'Playwright and Chromium are installed.' }
      : { ready: false, message: `${LAB_SETUP_MESSAGE} (looked for: ${executable})` };
  } catch {
    return { ready: false, message: 'The @playwright/test package is missing. Run npm install in the project folder.' };
  }
}

/* ---------- dev-server middleware ---------- */

/*
 * Bug ids are flag names from the playground pages: matches "emailCase", "age18", rejects "x;rm" or "a b".
 * https://regex101.com/?regex=%5E%5BA-Za-z0-9%5D%2B%24
 */
const BUG_ID = /^[A-Za-z0-9]+$/;

/*
 * Only the app itself may start runs (the runner executes code): matches "http://localhost:5173", "http://127.0.0.1:5173",
 * rejects "https://evil.example". https://regex101.com/?regex=%5Ehttp%3A%2F%2F(localhost%7C127%5C.0%5C.0%5C.1)(%3A%5Cd%2B)%3F%24
 */
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function parseRequest(raw: string): LabRunRequest | null {
  try {
    const body = JSON.parse(raw) as Partial<LabRunRequest>;
    const bugs = Array.isArray(body.bugs) ? body.bugs : [];
    const valid = typeof body.code === 'string' && bugs.length <= MAX_BUGS_PER_RUN && bugs.every((b) => typeof b === 'string' && BUG_ID.test(b));
    return valid ? { code: body.code ?? '', bugs } : null;
  } catch {
    return null;
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(JSON.stringify(body));
}

function isLocalRequest(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  return origin === undefined || LOCAL_ORIGIN.test(origin);
}

type Next = (err?: unknown) => void;

/** One run at a time: Playwright already uses several workers per run. */
const state = { running: false };

async function handleRun(root: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const raw = await readBody(req);
  const request = Buffer.byteLength(raw) <= MAX_BODY_BYTES ? parseRequest(raw) : null;
  if (!request) {
    sendJson(res, HTTP_BAD_REQUEST, { ok: false, reason: 'error', message: 'Bad lab request.' });
    return;
  }
  if (state.running) {
    sendJson(res, HTTP_OK, { ok: false, reason: 'busy', message: 'Another Playwright run is still in progress. Wait for it to finish.' });
    return;
  }
  state.running = true;
  try {
    sendJson(res, HTTP_OK, await runLab(root, request));
  } finally {
    state.running = false;
  }
}

async function handle(root: string, req: IncomingMessage, res: ServerResponse, next: Next): Promise<void> {
  const url = req.url ?? '';
  if (!isLocalRequest(req)) {
    sendJson(res, HTTP_FORBIDDEN, { ok: false, reason: 'error', message: 'Forbidden' });
    return;
  }
  if (req.method === 'GET' && url.startsWith('/status')) {
    sendJson(res, HTTP_OK, await labStatus(root));
    return;
  }
  if (req.method === 'POST' && url.startsWith('/run') && (req.headers['content-type'] ?? '').startsWith('application/json')) {
    await handleRun(root, req, res);
    return;
  }
  next();
}

async function handleSafely(root: string, req: IncomingMessage, res: ServerResponse, next: Next): Promise<void> {
  try {
    await handle(root, req, res, next);
  } catch (e) {
    sendJson(res, HTTP_SERVER_ERROR, { ok: false, reason: 'error', message: String(e) });
  }
}

/** Connect-style middleware mounted at LAB_ROUTE. */
export function labMiddleware(root: string) {
  return (req: IncomingMessage, res: ServerResponse, next: Next): void => {
    void handleSafely(root, req, res, next);
  };
}
