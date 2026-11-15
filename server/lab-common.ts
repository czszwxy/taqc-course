import fs from 'node:fs';
import path from 'node:path';

/** Folders and helpers shared by the TypeScript lab (lab-runner.ts) and the Python lab (lab-python.ts). */

export const LAB_DIR = 'lab';
export const RUNS_DIR = '.runs';

/** A whole graded run (all page variants) must finish within this time. */
export const RUN_TIMEOUT_MS = 120_000;
export const MS_PER_SECOND = 1000;
const MAX_ERROR_CHARS = 3_000;

/** Project-local browser folder (installed by `npm run lab:setup` / `lab:python-setup`), shared by both labs. */
export function labBrowsersDir(root: string): string {
  return path.join(root, LAB_DIR, '.browsers');
}

export function hasLocalChromium(root: string): boolean {
  const dir = labBrowsersDir(root);
  return fs.existsSync(dir) && fs.readdirSync(dir).some((name) => name.startsWith('chromium'));
}

/*
 * ANSI colour codes in Playwright messages: matches "\u001b[31m" / "\u001b[2m", rejects plain "[31m".
 * https://regex101.com/?regex=%5Cu001b%5C%5B%5B0-9%3B%5D*m&flags=g
 */
const ANSI = /\u001b\[[0-9;]*m/g;

export function cleanMessage(message: string): string {
  const text = message.replace(ANSI, '').trim();
  return text.length > MAX_ERROR_CHARS ? `${text.slice(0, MAX_ERROR_CHARS)}\n…` : text;
}
