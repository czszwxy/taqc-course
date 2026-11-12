/**
 * Installs Chromium for the Playwright lab into the project (lab/.browsers) instead of the per-user folder,
 * so every way of running the lab (in-app Check, npm run lab, validate:lab) finds the same browser.
 *
 * Run: npm run lab:setup
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { labBrowsersDir } from '../server/lab-runner';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');
const target = labBrowsersDir(root);

console.log(`Installing Chromium for Playwright into ${target} …`);
const result = spawnSync(process.execPath, [cli, 'install', 'chromium'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: target },
});
process.exit(result.status ?? 1);
