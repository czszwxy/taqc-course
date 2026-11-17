/**
 * Runs your own Python Playwright practice tests (lab/python/tests) with the lab's venv, or a Playwright tool.
 *   npm run lab:py -- --headed -k sign_in                    → pytest with these arguments
 *   npm run lab:py-codegen -- http://localhost:5173/playground/login   → Codegen recording a pytest test
 *   npm run lab:py-trace -- test-results/<folder>/trace.zip  → the Trace Viewer
 *   npm run lab:py-api [-- api/other.py]                     → your own FastAPI app (lab/python/api/main.py) with fastapi dev
 *   npm run lab:py-django -- runserver | migrate | createsuperuser | makemigrations | shell | startapp <name>
 *                                                            → manage.py of the Django practice project (lab/python/django_site)
 * Needs `npm run lab:python-setup` once; pytest and Codegen also need the running app (launcher or npm run dev).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAB_BASE_URL } from '../server/lab-types';
import { LAB_PYTHON_SETUP_MESSAGE, labPythonDir, labVenvPython, missingPythonLab, pythonLabEnv } from '../server/lab-python';
import { missingPythonTaskLab, PYTHON_TASK_SETUP_MESSAGE } from '../server/lab-python-tasks';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PING_TIMEOUT_MS = 3_000;
/** process.argv = [node, this script, ...arguments]. */
const FIRST_USER_ARG = 2;
/** The first argument "playwright" runs the Playwright CLI (codegen, show-trace) instead of pytest. */
const PLAYWRIGHT_TOOL = 'playwright';
const TOOLS_WITHOUT_APP = new Set(['show-trace']);
/** The first argument "api" starts the learner's FastAPI app on http://127.0.0.1:8000 (Swagger UI at /docs). */
const API_TOOL = 'api';
const DEFAULT_API_FILE = 'api/main.py';
/** The first argument "django" runs manage.py of the Django practice project with the rest of the arguments. */
const DJANGO_TOOL = 'django';
const DJANGO_SITE_DIR = 'django_site';

/** Runs the lab venv's Python with these arguments in a folder of lab/python; exits with its exit code. */
function runPython(args: string[], folder: string): never {
  const missing = missingPythonTaskLab(root);
  if (missing !== null) {
    console.error(`✗ ${PYTHON_TASK_SETUP_MESSAGE} (${missing})`);
    process.exit(1);
  }
  const result = spawnSync(labVenvPython(root), args, { cwd: path.join(labPythonDir(root), folder), stdio: 'inherit', env: pythonLabEnv(root) });
  process.exit(result.status ?? 1);
}

/** fastapi dev reloads the app on every save; Ctrl+C stops it. Needs no browser and no running course app. */
function runApi(file: string | undefined): never {
  return runPython(['-m', 'fastapi', 'dev', file ?? DEFAULT_API_FILE], '.');
}

async function appIsRunning(): Promise<boolean> {
  try {
    const res = await fetch(LAB_BASE_URL, { signal: AbortSignal.timeout(PING_TIMEOUT_MS) });
    return res.ok;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  if (process.argv[FIRST_USER_ARG] === API_TOOL) runApi(process.argv[FIRST_USER_ARG + 1]);
  if (process.argv[FIRST_USER_ARG] === DJANGO_TOOL) runPython(['manage.py', ...process.argv.slice(FIRST_USER_ARG + 1)], DJANGO_SITE_DIR);
  const missing = missingPythonLab(root);
  if (missing !== null) {
    console.error(`✗ ${LAB_PYTHON_SETUP_MESSAGE} (${missing})`);
    process.exit(1);
  }
  const [first, ...rest] = process.argv.slice(FIRST_USER_ARG);
  const isTool = first === PLAYWRIGHT_TOOL;
  const needsApp = !(isTool && TOOLS_WITHOUT_APP.has(rest[0] ?? ''));
  if (needsApp && !(await appIsRunning())) {
    console.error(`✗ The app is not running at ${LAB_BASE_URL}. Start it (launcher or npm run dev) in another terminal, then run this again.`);
    process.exit(1);
  }
  const args = isTool ? ['-m', 'playwright', ...rest] : ['-m', 'pytest', ...(first === undefined ? [] : [first]), ...rest];
  const result = spawnSync(labVenvPython(root), args, { cwd: labPythonDir(root), stdio: 'inherit', env: pythonLabEnv(root) });
  process.exit(result.status ?? 1);
}

await main();
