import { defineConfig } from '@playwright/test';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * `npm run test:accounts`: end-to-end tests of user accounts against the LOCAL Supabase (`npm run db:start`, Docker).
 * The app runs on a spare port with the local keys, so the owner's dev server on 5173 and its progress stay untouched.
 */
const ROOT = path.resolve(__dirname, '..');
const APP_PORT = 5175;
const TEST_TIMEOUT_MS = 60_000;
const SERVER_TIMEOUT_MS = 120_000;
/**
 * One `NAME="value"` line of `supabase status -o env`. Matches 'API_URL="http://127.0.0.1:54321"' (groups API_URL and
 * the URL); rejects 'Stopped services: [...]'. https://regex101.com/?regex=%5E(%5BA-Z_%5D%2B)%3D%22%3F(.*%3F)%22%3F%24&testString=API_URL%3D%22http%3A%2F%2F127.0.0.1%3A54321%22
 */
const LINE = /^([A-Z_]+)="?(.*?)"?$/;
/** A line break, Windows or Unix. Matches "\r\n" and "\n"; rejects "\r" alone. https://regex101.com/?regex=%5Cr%3F%5Cn&testString=a%0Ab */
const NEWLINE = /\r?\n/;

/** `supabase status -o env` as an object (API_URL, PUBLISHABLE_KEY / ANON_KEY, SECRET_KEY / SERVICE_ROLE_KEY…). */
function localSupabase(): Record<string, string> {
  const out = execSync('npx supabase status -o env', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  return Object.fromEntries(out.split(NEWLINE).flatMap((line) => {
    const match = LINE.exec(line.trim());
    return match ? [[match[1], match[2]]] : [];
  }));
}

const status = localSupabase();
process.env.E2E_SUPABASE_URL = status.API_URL;
process.env.E2E_PUBLISHABLE_KEY = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
process.env.E2E_SECRET_KEY = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;

const browsers = path.join(ROOT, 'lab', '.browsers');
if (fs.existsSync(browsers)) process.env.PLAYWRIGHT_BROWSERS_PATH = browsers;

export default defineConfig({
  testDir: '.',
  timeout: TEST_TIMEOUT_MS,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${APP_PORT}`, trace: 'retain-on-failure' },
  outputDir: path.join(ROOT, 'e2e', '.results'),
  webServer: {
    command: `node node_modules/vite/bin/vite.js --port ${APP_PORT} --strictPort`,
    cwd: ROOT,
    url: `http://localhost:${APP_PORT}`,
    reuseExistingServer: false,
    timeout: SERVER_TIMEOUT_MS,
    env: { VITE_SUPABASE_URL: status.API_URL, VITE_SUPABASE_PUBLISHABLE_KEY: process.env.E2E_PUBLISHABLE_KEY ?? '' },
  },
});
