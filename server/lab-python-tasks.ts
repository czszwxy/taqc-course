import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { cleanMessage, LAB_DIR, RUNS_DIR } from './lab-common';
import { killTree, labPythonDir, labVenvPython, parallelism, pythonLabEnv, runPool, sitePackages } from './lab-python';
import {
  LAB_PYTHON_RUN_TIMEOUT_MS,
  LAB_PYTHON_TEST_TIMEOUT_MS,
  PROJECT_FILE,
  type LabPythonJob,
  type LabPythonResponse,
  type LabPythonResult,
  type LabStatus,
} from './lab-types';

/**
 * Python tasks with `"runtime": "lab"` (FastAPI, Django — packages the browser's Pyodide does not have): each job
 * writes the task files into lab/.runs/<uuid>, then runs real pytest in lab/.venv with lab/python/qa_task_plugin.py,
 * which writes the results in the browser runner's shape — or, for Run, `python <entry>`. Jobs of one request
 * (the real code + every mutant) run a few at a time. No browser and no running app are needed.
 * Used by the dev-server middleware (POST /__lab/python/run) and by scripts/validate-content.ts.
 */

export const PYTHON_TASK_SETUP_MESSAGE =
  'Python with pytest, FastAPI and Django is not installed in the course lab yet. Run this once in a terminal in the project folder: npm run lab:python-setup — then press Check again.';

const PLUGIN_FILE = 'qa_task_plugin.py';
const PLUGIN_NAME = 'qa_task_plugin';
const INI_FILE = 'pytest.ini';
/** Only the task's own test file is collected (support files such as test_data.py are not tests). */
const INI_CONTENT = '[pytest]\npython_files = tests.py\n';
const RESULT_FILE = 'result.json';
const OUTPUT_TAIL_CHARS = 2_000;

/** The packages a lab Python task imports (folder names in site-packages; PyJWT installs as "jwt"; python_multipart reads login forms; pydantic_settings — settings from the environment; django + pytest_django + rest_framework for module 43). */
const REQUIRED_PACKAGES = ['pytest', 'fastapi', 'httpx', 'sqlalchemy', 'jwt', 'python_multipart', 'pydantic_settings', 'django', 'pytest_django', 'rest_framework'];

/** null when the venv has everything lab Python tasks need, otherwise what is missing. Chromium is not needed. */
export function missingPythonTaskLab(root: string): string | null {
  if (!fs.existsSync(labVenvPython(root))) return 'no virtual environment at lab/.venv';
  const site = sitePackages(root);
  const missing = REQUIRED_PACKAGES.filter((name) => site === null || !fs.existsSync(path.join(site, name)));
  return missing.length > 0 ? `missing Python packages: ${missing.join(', ')}` : null;
}

export function pythonTaskLabStatus(root: string): LabStatus {
  const missing = missingPythonTaskLab(root);
  return missing === null
    ? { ready: true, message: 'Python with pytest, FastAPI and Django (lab/.venv) is installed.' }
    : { ready: false, message: `${PYTHON_TASK_SETUP_MESSAGE} (${missing})` };
}

/** True when the name is a plain relative project path (.py / .html) that cannot replace the grading plugin. */
export function isTaskFileName(name: string): boolean {
  return PROJECT_FILE.test(name) && name !== PLUGIN_FILE;
}

interface ProcessOutcome {
  stdout: string;
  stderr: string;
  code: number | null;
  timedOut: boolean;
}

function runProcess(root: string, cwd: string, args: string[], env: NodeJS.ProcessEnv, timeoutMs: number): Promise<ProcessOutcome> {
  return new Promise((resolve) => {
    const child = spawn(labVenvPython(root), args, { cwd, env, windowsHide: true });
    const out: string[] = [];
    const err: string[] = [];
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child);
    }, timeoutMs);
    child.stdout.on('data', (d: Buffer) => out.push(d.toString()));
    child.stderr.on('data', (d: Buffer) => err.push(d.toString()));
    child.on('error', (e) => err.push(String(e)));
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout: out.join(''), stderr: err.join(''), code, timedOut });
    });
  });
}

function writeJob(root: string, runDir: string, job: LabPythonJob): void {
  Object.entries(job.files).forEach(([name, code]) => {
    const file = path.join(runDir, ...name.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, code);
  });
  fs.copyFileSync(path.join(labPythonDir(root), PLUGIN_FILE), path.join(runDir, PLUGIN_FILE));
  fs.writeFileSync(path.join(runDir, INI_FILE), INI_CONTENT);
}

/** Paths inside the run folder are shown relative to it ("solution.py", not "D:\…\lab\.runs\…\solution.py"). */
const relativeTo = (runDir: string, text: string): string => cleanMessage(text.split(runDir + path.sep).join(''));

async function runTests(root: string, runDir: string, job: LabPythonJob, env: NodeJS.ProcessEnv): Promise<LabPythonResult> {
  const resultFile = path.join(runDir, RESULT_FILE);
  const args = ['-m', 'pytest', job.entry, '-c', INI_FILE, '--rootdir', '.', '-p', 'no:cacheprovider', '-p', PLUGIN_NAME, '-vv'];
  // Other pytest plugins of the venv (pytest-playwright, allure…) are not loaded: faster and nothing extra to explain.
  const outcome = await runProcess(root, runDir, args, { ...env, PYTEST_DISABLE_PLUGIN_AUTOLOAD: '1', QA_TASK_RESULT_FILE: resultFile }, LAB_PYTHON_TEST_TIMEOUT_MS);
  if (outcome.timedOut) return { error: null, tests: [], stdout: '', timedOut: true };
  if (!fs.existsSync(resultFile)) {
    return { error: `pytest did not produce results:\n${relativeTo(runDir, `${outcome.stdout}${outcome.stderr}`.slice(-OUTPUT_TAIL_CHARS))}`, tests: [], stdout: '' };
  }
  const result = JSON.parse(fs.readFileSync(resultFile, 'utf8')) as LabPythonResult;
  return {
    error: result.error === null ? null : relativeTo(runDir, result.error),
    tests: result.tests.map((t) => ({ ...t, error: relativeTo(runDir, t.error) })),
    stdout: result.stdout,
  };
}

async function runProgram(root: string, runDir: string, job: LabPythonJob, env: NodeJS.ProcessEnv): Promise<LabPythonResult> {
  const outcome = await runProcess(root, runDir, [job.entry], env, LAB_PYTHON_RUN_TIMEOUT_MS);
  if (outcome.timedOut) return { error: null, tests: [], stdout: outcome.stdout, timedOut: true };
  const failed = outcome.code !== 0;
  return {
    error: failed ? relativeTo(runDir, outcome.stderr.slice(-OUTPUT_TAIL_CHARS)) || `exit code ${outcome.code ?? '?'}` : null,
    tests: [],
    stdout: failed ? outcome.stdout : `${outcome.stdout}${outcome.stderr}`,
  };
}

async function runJob(root: string, job: LabPythonJob): Promise<LabPythonResult> {
  const runDir = path.join(root, LAB_DIR, RUNS_DIR, randomUUID());
  try {
    fs.mkdirSync(runDir, { recursive: true });
    writeJob(root, runDir, job);
    const env = pythonLabEnv(root);
    return job.kind === 'test' ? await runTests(root, runDir, job, env) : await runProgram(root, runDir, job, env);
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), tests: [], stdout: '' };
  } finally {
    fs.rmSync(runDir, { recursive: true, force: true });
  }
}

/** Runs the jobs (a few at a time) and returns one result per job, in order. Never throws. */
export async function runPythonTaskJobs(root: string, jobs: readonly LabPythonJob[]): Promise<LabPythonResponse> {
  const missing = missingPythonTaskLab(root);
  if (missing !== null) return { ok: false, reason: 'setup', message: `${PYTHON_TASK_SETUP_MESSAGE} (${missing})` };
  const results = await runPool(jobs, parallelism(), (job) => runJob(root, job));
  return { ok: true, results };
}
