/**
 * Sets up the Python Playwright lab inside the project:
 *  1. finds Python 3.9+ (the Windows launcher `py -3`, then python3 / python);
 *  2. creates the virtual environment lab/.venv (once);
 *  3. installs lab/python/requirements.txt (pytest, pytest-playwright, playwright) into it;
 *  4. installs Chromium into lab/.browsers — the same folder the TypeScript lab uses (no-op when it is there).
 * Safe to run again: every step skips work that is already done.
 *
 * Run: npm run lab:python-setup
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { labBrowsersDir } from '../server/lab-common';
import { labPythonDir, labVenvDir, labVenvPython } from '../server/lab-python';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIN_MAJOR = 3;
const MIN_MINOR = 9;

interface PythonCommand {
  command: string;
  args: string[];
}

const CANDIDATES: PythonCommand[] = [
  { command: 'py', args: ['-3'] },
  { command: 'python3', args: [] },
  { command: 'python', args: [] },
];

/** "3.13" printed by the candidate, or null when it is not a usable Python. */
function versionOf(candidate: PythonCommand): string | null {
  const probe = spawnSync(candidate.command, [...candidate.args, '-c', 'import sys; print(f"{sys.version_info[0]}.{sys.version_info[1]}")'], {
    encoding: 'utf8',
  });
  return probe.status === 0 ? probe.stdout.trim() : null;
}

function isSupported(version: string): boolean {
  const [major = 0, minor = 0] = version.split('.').map(Number);
  return major > MIN_MAJOR || (major === MIN_MAJOR && minor >= MIN_MINOR);
}

function findPython(): PythonCommand | null {
  return CANDIDATES.find((c) => {
    const version = versionOf(c);
    return version !== null && isSupported(version);
  }) ?? null;
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv = process.env): void {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', env });
  if (result.status !== 0) {
    console.error(`\n✗ Failed: ${command} ${args.join(' ')}`);
    process.exit(result.status ?? 1);
  }
}

function main(): void {
  const venvPython = labVenvPython(root);
  if (!fs.existsSync(venvPython)) {
    const python = findPython();
    if (!python) {
      console.error(`✗ Python ${MIN_MAJOR}.${MIN_MINOR}+ was not found. Install it from https://www.python.org/downloads/ (tick "Add python.exe to PATH"), then run this again.`);
      process.exit(1);
    }
    console.log(`Creating the virtual environment ${labVenvDir(root)} …`);
    run(python.command, [...python.args, '-m', 'venv', labVenvDir(root)]);
  }
  console.log('Installing pytest, pytest-playwright and playwright into lab/.venv …');
  run(venvPython, ['-m', 'pip', 'install', '--disable-pip-version-check', '-r', path.join(labPythonDir(root), 'requirements.txt')]);
  console.log(`Installing Chromium into ${labBrowsersDir(root)} (skipped when it is already there) …`);
  run(venvPython, ['-m', 'playwright', 'install', 'chromium'], { ...process.env, PLAYWRIGHT_BROWSERS_PATH: labBrowsersDir(root) });
  console.log('\n✓ The Python Playwright lab is ready.');
}

main();
