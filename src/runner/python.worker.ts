/// <reference lib="webworker" />
import type { PyodideAPI } from 'pyodide';
import runnerSource from './python/qa_runner.py?raw';
import pytestShim from './python/pytest_shim.py?raw';
import { packagesFor } from './python-packages';
import type { PythonJob, PythonWorkerMessage } from './python-protocol';

/*
 * Python task worker: loads Pyodide once from /pyodide/ (served locally by vite.config.ts) and runs
 * jobs with qa_runner.py. The client starts its time limit when it receives "started", so loading
 * Pyodide (a few seconds the first time) and bundled packages the job imports (python-packages.ts)
 * is not counted as the learner's run time.
 */

/** Under the build's base path, so it also works on the website (/taqc-course/pyodide/). */
const PYODIDE_URL = `${import.meta.env.BASE_URL}pyodide/`;
const RUNTIME_DIR = '/home/pyodide/qa_runtime';

interface PyodideModule {
  loadPyodide: (options: { indexURL: string }) => Promise<PyodideAPI>;
}

let ready: Promise<PyodideAPI> | null = null;

async function boot(): Promise<PyodideAPI> {
  const mod = (await import(/* @vite-ignore */ `${PYODIDE_URL}pyodide.mjs`)) as PyodideModule;
  const py = await mod.loadPyodide({ indexURL: PYODIDE_URL });
  py.FS.mkdirTree(RUNTIME_DIR);
  py.FS.writeFile(`${RUNTIME_DIR}/qa_runner.py`, runnerSource);
  py.runPython(`import sys\nsys.path.insert(0, "${RUNTIME_DIR}")\nimport qa_runner`);
  return py;
}

const loadedPackages = new Set<string>();

/** Loads (once per worker) the bundled packages the job imports, then imports them so the first run is fast. */
async function loadPackages(py: PyodideAPI, files: Record<string, string>): Promise<void> {
  const missing = packagesFor(files).filter((pkg) => !loadedPackages.has(pkg.module));
  if (missing.length === 0) {
    return;
  }
  const urls = missing.flatMap((pkg) => pkg.wheels.map((wheel) => new URL(`${PYODIDE_URL}${wheel}`, self.location.href).href));
  const errors: string[] = [];
  await py.loadPackage(urls, { messageCallback: () => undefined, errorCallback: (message) => errors.push(message) });
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
  missing.forEach((pkg) => {
    py.runPython(pkg.warmUp);
    loadedPackages.add(pkg.module);
  });
}

function post(message: PythonWorkerMessage): void {
  self.postMessage(message);
}

self.onmessage = async (event: MessageEvent<PythonJob>) => {
  const job = event.data;
  try {
    ready ??= boot();
    const py = await ready;
    await loadPackages(py, job.files);
    post({ id: job.id, type: 'started' });
    const files = { 'pytest.py': pytestShim, ...job.files };
    py.globals.set('job_files', JSON.stringify(files));
    py.globals.set('job_entry', job.entry);
    const fn = job.kind === 'run' ? 'run_program' : 'run_tests';
    const output = py.runPython(`qa_runner.${fn}(job_files, job_entry)`) as string;
    post({ id: job.id, type: 'done', result: JSON.parse(output) });
  } catch (err) {
    post({ id: job.id, type: 'done', result: { error: `Python could not start: ${String(err)}`, tests: [], stdout: '' } });
  }
};
