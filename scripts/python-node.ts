import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPyodide, type PyodideAPI } from 'pyodide';
import { PYTHON_PACKAGES_DIR, packagesFor } from '../src/runner/python-packages';
import type { PythonRunResult } from '../src/runner/python-protocol';

/*
 * Runs Python tasks in Node with the same Pyodide build, the same bundled packages and the same qa_runner.py
 * as the browser worker, so `npm run validate` proves every python task is solvable.
 */

const RUNTIME_DIR = '/home/pyodide/qa_runtime';
const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const runnerDir = path.join(projectRoot, 'src', 'runner', 'python');
const loadedPackages = new Set<string>();

/** Same as loadPackages in python.worker.ts, from the vendor folder. Pyodide needs forward slashes in wheel paths. */
async function loadPackages(py: PyodideAPI, files: Record<string, string>): Promise<void> {
  const missing = packagesFor(files).filter((pkg) => !loadedPackages.has(pkg.module));
  if (missing.length === 0) {
    return;
  }
  const wheelPaths = missing.flatMap((pkg) => pkg.wheels.map((wheel) => path.join(projectRoot, PYTHON_PACKAGES_DIR, wheel).replaceAll('\\', '/')));
  const errors: string[] = [];
  await py.loadPackage(wheelPaths, { messageCallback: () => undefined, errorCallback: (message) => errors.push(message) });
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
  missing.forEach((pkg) => {
    py.runPython(pkg.warmUp);
    loadedPackages.add(pkg.module);
  });
}

let ready: Promise<PyodideAPI> | null = null;

async function boot(): Promise<PyodideAPI> {
  const py = await loadPyodide();
  py.FS.mkdirTree(RUNTIME_DIR);
  py.FS.writeFile(`${RUNTIME_DIR}/qa_runner.py`, fs.readFileSync(path.join(runnerDir, 'qa_runner.py'), 'utf8'));
  py.runPython(`import sys\nsys.path.insert(0, "${RUNTIME_DIR}")\nimport qa_runner`);
  return py;
}

const pytestShim = () => fs.readFileSync(path.join(runnerDir, 'pytest_shim.py'), 'utf8');

export async function runPythonJob(kind: 'test' | 'run', files: Record<string, string>, entry: string): Promise<PythonRunResult> {
  ready ??= boot();
  const py = await ready;
  await loadPackages(py, files);
  py.globals.set('job_files', JSON.stringify({ 'pytest.py': pytestShim(), ...files }));
  py.globals.set('job_entry', entry);
  const fn = kind === 'run' ? 'run_program' : 'run_tests';
  return JSON.parse(py.runPython(`qa_runner.${fn}(job_files, job_entry)`) as string) as PythonRunResult;
}
