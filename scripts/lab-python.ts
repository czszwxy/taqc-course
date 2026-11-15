/**
 * Runs your own Python Playwright practice tests (lab/python/tests) with the lab's venv, or a Playwright tool.
 *   npm run lab:py -- --headed -k sign_in                    → pytest with these arguments
 *   npm run lab:py-codegen -- http://localhost:5173/playground/login   → Codegen recording a pytest test
 *   npm run lab:py-trace -- test-results/<folder>/trace.zip  → the Trace Viewer
 * Needs `npm run lab:python-setup` once; pytest and Codegen also need the running app (launcher or npm run dev).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAB_BASE_URL } from '../server/lab-types';
import { LAB_PYTHON_SETUP_MESSAGE, labPythonDir, labVenvPython, missingPythonLab, pythonLabEnv } from '../server/lab-python';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PING_TIMEOUT_MS = 3_000;
/** process.argv = [node, this script, ...arguments]. */
const FIRST_USER_ARG = 2;
/** The first argument "playwright" runs the Playwright CLI (codegen, show-trace) instead of pytest. */
const PLAYWRIGHT_TOOL = 'playwright';
const TOOLS_WITHOUT_APP = new Set(['show-trace']);

async function appIsRunning(): Promise<boolean> {
  try {
    const res = await fetch(LAB_BASE_URL, { signal: AbortSignal.timeout(PING_TIMEOUT_MS) });
    return res.ok;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
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
