/// <reference lib="webworker" />
import type { PyodideAPI } from 'pyodide';
import runnerSource from './python/qa_runner.py?raw';
import pytestShim from './python/pytest_shim.py?raw';
import type { PythonJob, PythonWorkerMessage } from './python-protocol';

/*
 * Python task worker: loads Pyodide once from /pyodide/ (served locally by vite.config.ts) and runs
 * jobs with qa_runner.py. The client starts its time limit when it receives "started", so loading
 * Pyodide (a few seconds the first time) is not counted as the learner's run time.
 */

const PYODIDE_URL = '/pyodide/';
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

function post(message: PythonWorkerMessage): void {
  self.postMessage(message);
}

self.onmessage = async (event: MessageEvent<PythonJob>) => {
  const job = event.data;
  try {
    ready ??= boot();
    const py = await ready;
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
