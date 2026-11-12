import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPyodide, type PyodideAPI } from 'pyodide';
import type { PythonRunResult } from '../src/runner/python-protocol';

/*
 * Runs Python tasks in Node with the same Pyodide build and the same qa_runner.py as the browser worker,
 * so `npm run validate` proves every python task is solvable.
 */

const RUNTIME_DIR = '/home/pyodide/qa_runtime';
const runnerDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'runner', 'python');

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
  py.globals.set('job_files', JSON.stringify({ 'pytest.py': pytestShim(), ...files }));
  py.globals.set('job_entry', entry);
  const fn = kind === 'run' ? 'run_program' : 'run_tests';
  return JSON.parse(py.runPython(`qa_runner.${fn}(job_files, job_entry)`) as string) as PythonRunResult;
}
