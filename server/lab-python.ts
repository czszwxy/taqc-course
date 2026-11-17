import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cleanMessage, hasLocalChromium, LAB_DIR, labBrowsersDir, MS_PER_SECOND, RUN_TIMEOUT_MS, RUNS_DIR } from './lab-common';
import {
  LAB_BASE_URL,
  LAB_BUG_PREFIX,
  LAB_CORRECT_PROJECT,
  LAB_NO_BUGS,
  type LabProjectResult,
  type LabRunRequest,
  type LabRunResult,
  type LabStatus,
  type LabTestResult,
} from './lab-types';

/**
 * The Python Playwright lab: pytest + pytest-playwright in a project-local venv (lab/.venv, `npm run lab:python-setup`).
 * A graded run writes the learner's file as test_learner.py next to lab/python/qa_lab_plugin.py (as conftest.py) and
 * starts one pytest process per page variant — the correct page and one per bug — a few at a time. The plugin puts
 * "qa-lab-bugs=<variant>" into the browser user agent and writes each variant's results as JSON.
 * Used by server/lab-runner.ts (runLab, labStatus) and the scripts lab-python-setup.ts / lab-python.ts.
 */

const VENV_DIR = '.venv';
const IS_WINDOWS = process.platform === 'win32';
const LEARNER_FILE = 'test_learner.py';
const PLUGIN_FILE = 'qa_lab_plugin.py';
const INI_FILE = 'pytest.ini';
/** pytest.ini of a graded run: also stops pytest from picking up any config from the folders above. */
const INI_CONTENT = '[pytest]\npython_files = test_*.py\n';
const OUTPUT_TAIL_CHARS = 2_000;
/** Each variant is a pytest process with its own Chromium: half of the cores keeps the machine responsive. */
const CORES_PER_PROCESS = 2;

export const LAB_PYTHON_SETUP_MESSAGE =
  'The Python Playwright lab is not installed yet. Run this once in a terminal in the project folder: npm run lab:python-setup — then press Check again.';

/** lab/python: requirements.txt, the grading plugin (qa_lab_plugin.py) and the learner's practice tests. */
export function labPythonDir(root: string): string {
  return path.join(root, LAB_DIR, 'python');
}

export function labVenvDir(root: string): string {
  return path.join(root, LAB_DIR, VENV_DIR);
}

/** The venv's own interpreter (Scripts\python.exe on Windows, bin/python elsewhere). */
export function labVenvPython(root: string): string {
  return IS_WINDOWS ? path.join(labVenvDir(root), 'Scripts', 'python.exe') : path.join(labVenvDir(root), 'bin', 'python');
}

/** site-packages of the venv: Lib\site-packages on Windows, lib/python3.X/site-packages elsewhere. */
export function sitePackages(root: string): string | null {
  if (IS_WINDOWS) return path.join(labVenvDir(root), 'Lib', 'site-packages');
  const lib = path.join(labVenvDir(root), 'lib');
  const version = fs.existsSync(lib) ? fs.readdirSync(lib).find((name) => name.startsWith('python')) : undefined;
  return version ? path.join(lib, version, 'site-packages') : null;
}

/** The packages a graded run imports. */
const REQUIRED_PACKAGES = ['playwright', 'pytest_playwright', 'pytest', 'requests', 'pydantic', 'axe_playwright_python'];

/** null when the venv is ready, otherwise what is missing. */
export function missingPythonLab(root: string): string | null {
  if (!fs.existsSync(labVenvPython(root))) return `no virtual environment at ${labVenvDir(root)}`;
  const site = sitePackages(root);
  const missing = REQUIRED_PACKAGES.filter((name) => site === null || !fs.existsSync(path.join(site, name)));
  if (missing.length > 0) return `missing Python packages: ${missing.join(', ')}`;
  return hasLocalChromium(root) ? null : `no Chromium in ${labBrowsersDir(root)}`;
}

export function pythonLabStatus(root: string): LabStatus {
  const missing = missingPythonLab(root);
  return missing === null
    ? { ready: true, message: 'pytest, pytest-playwright and Chromium (lab/.venv, lab/.browsers) are installed.' }
    : { ready: false, message: `${LAB_PYTHON_SETUP_MESSAGE} (${missing})` };
}

/** Environment for any Python lab process: the shared browsers folder, UTF-8 output, no __pycache__ in the run folder. */
export function pythonLabEnv(root: string): NodeJS.ProcessEnv {
  return { ...process.env, PLAYWRIGHT_BROWSERS_PATH: labBrowsersDir(root), PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', PYTHONDONTWRITEBYTECODE: '1' };
}

/* ---------- one graded run ---------- */

interface Variant {
  name: string;
  bugs: string;
}

interface VariantResult {
  tests: LabTestResult[];
  errors: string[];
}

interface VariantOutcome {
  output: string;
  timedOut: boolean;
  result: VariantResult | null;
}

function variantsOf(request: LabRunRequest): Variant[] {
  return [{ name: LAB_CORRECT_PROJECT, bugs: LAB_NO_BUGS }, ...request.bugs.map((bug) => ({ name: LAB_BUG_PREFIX + bug, bugs: bug }))];
}

function writeRun(root: string, runDir: string, code: string): void {
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, LEARNER_FILE), code);
  fs.copyFileSync(path.join(labPythonDir(root), PLUGIN_FILE), path.join(runDir, 'conftest.py'));
  fs.writeFileSync(path.join(runDir, INI_FILE), INI_CONTENT);
}

/** Windows does not stop a process's children (the Playwright driver, Chromium) with it: kill the whole tree. */
export function killTree(child: ChildProcess): void {
  if (IS_WINDOWS && child.pid !== undefined) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
  else child.kill();
}

function readResult(file: string): VariantResult | null {
  if (!fs.existsSync(file)) return null;
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as VariantResult;
  return { tests: parsed.tests.map((t) => (t.error ? { ...t, error: cleanMessage(t.error) } : t)), errors: parsed.errors.map(cleanMessage) };
}

function runVariant(root: string, runDir: string, variant: Variant, index: number, deadline: number): Promise<VariantOutcome> {
  const resultFile = path.join(runDir, `result-${index}.json`);
  const args = [
    '-m', 'pytest', LEARNER_FILE,
    '-c', INI_FILE, '--rootdir', '.',
    '-p', 'no:cacheprovider',
    '--base-url', LAB_BASE_URL,
    '--browser', 'chromium',
    '--output', `output-${index}`,
    '-q',
  ];
  return new Promise((resolve) => {
    const child = spawn(labVenvPython(root), args, {
      cwd: runDir,
      env: { ...pythonLabEnv(root), QA_LAB_BUGS: variant.bugs, QA_LAB_RESULT_FILE: resultFile },
      windowsHide: true,
    });
    const chunks: string[] = [];
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child);
    }, Math.max(0, deadline - Date.now()));
    child.stdout.on('data', (d: Buffer) => chunks.push(d.toString()));
    child.stderr.on('data', (d: Buffer) => chunks.push(d.toString()));
    child.on('error', (e) => chunks.push(String(e)));
    child.on('close', () => {
      clearTimeout(timer);
      resolve({ output: chunks.join(''), timedOut, result: timedOut ? null : readResult(resultFile) });
    });
  });
}

/** Runs fn over items with at most `limit` running at the same time; results keep the order of items. */
export async function runPool<T, R>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  const cursor = { next: 0 };
  const worker = async (): Promise<void> => {
    const index = cursor.next;
    cursor.next += 1;
    const item = items[index];
    if (item === undefined) return;
    results[index] = await fn(item, index);
    await worker();
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export function parallelism(): number {
  return Math.max(1, Math.floor(os.cpus().length / CORES_PER_PROCESS));
}

function failedRun(outcome: VariantOutcome): LabRunResult {
  if (outcome.output.includes("Executable doesn't exist")) return { ok: false, reason: 'setup', message: LAB_PYTHON_SETUP_MESSAGE };
  return { ok: false, reason: 'error', message: `pytest did not produce results:\n${cleanMessage(outcome.output.slice(-OUTPUT_TAIL_CHARS))}` };
}

/** Runs one graded Python lab run. Never throws. */
export async function runPythonLab(root: string, request: LabRunRequest): Promise<LabRunResult> {
  const missing = missingPythonLab(root);
  if (missing !== null) return { ok: false, reason: 'setup', message: `${LAB_PYTHON_SETUP_MESSAGE} (${missing})` };
  const started = Date.now();
  const runDir = path.join(root, LAB_DIR, RUNS_DIR, randomUUID());
  try {
    writeRun(root, runDir, request.code);
    const variants = variantsOf(request);
    const deadline = started + RUN_TIMEOUT_MS;
    const outcomes = await runPool(variants, parallelism(), (variant, index) => runVariant(root, runDir, variant, index, deadline));
    if (outcomes.some((o) => o.timedOut)) {
      return { ok: false, reason: 'error', message: `The run took longer than ${RUN_TIMEOUT_MS / MS_PER_SECOND} s and was stopped. Look for a test that waits forever.` };
    }
    const broken = outcomes.find((o) => o.result === null);
    if (broken) return failedRun(broken);
    const projects: LabProjectResult[] = variants.map((variant, index) => ({
      name: variant.name,
      bug: variant.bugs === LAB_NO_BUGS ? null : variant.bugs,
      tests: outcomes[index]?.result?.tests ?? [],
    }));
    return { ok: true, projects, errors: outcomes[0]?.result?.errors ?? [], durationMs: Date.now() - started };
  } catch (e) {
    return { ok: false, reason: 'error', message: e instanceof Error ? e.message : String(e) };
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
}
