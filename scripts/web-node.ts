import { build } from 'esbuild';
import { hasLocalChromium, labBrowsersDir } from '../server/lab-common';
import type { WebCheckResult, checkWebTask } from '../src/runner/web';
import type { WebFile, WebRule } from '../src/content/schema';

/**
 * Web page tasks in Node (npm run validate): the app's own checker (src/runner/web.ts, bundled with esbuild)
 * runs inside a headless Chromium from lab/.browsers, on a page with a real origin — so the sandboxed iframe,
 * layout and computed styles behave exactly as in the learner's browser.
 */

/** A made-up origin answered by page.route: the iframe needs a same-origin parent, about:blank has none. */
const CHECK_ORIGIN = 'http://qa-web.test/';
const BLANK_PAGE = '<!doctype html><html><head><title>web checks</title></head><body></body></html>';

declare global {
  interface Window {
    __qaWeb?: { checkWebTask: typeof checkWebTask };
  }
}

type Files = Partial<Record<WebFile, string>>;

export interface WebRunner {
  check(learner: Files, support: Files, tests: string, width: number, rules: WebRule[]): Promise<WebCheckResult>;
  close(): Promise<void>;
}

export type WebRunnerStart = { runner: WebRunner } | { unavailable: string };

async function bundleChecker(root: string): Promise<string> {
  const result = await build({
    stdin: {
      contents: "import { checkWebTask } from './src/runner/web';\nwindow.__qaWeb = { checkWebTask };\n",
      resolveDir: root,
      sourcefile: 'web-checker.ts',
      loader: 'ts',
    },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    write: false,
    logLevel: 'silent',
  });
  return result.outputFiles[0]?.text ?? '';
}

/** Starts Chromium with the checker loaded, or says why it cannot (no Chromium in lab/.browsers). */
export async function startWebRunner(root: string): Promise<WebRunnerStart> {
  if (!hasLocalChromium(root)) return { unavailable: 'Chromium is not installed in lab/.browsers' };
  process.env.PLAYWRIGHT_BROWSERS_PATH = labBrowsersDir(root);
  const script = await bundleChecker(root);
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.route(`${CHECK_ORIGIN}**`, (route) => route.fulfill({ contentType: 'text/html', body: BLANK_PAGE }));
  await page.goto(CHECK_ORIGIN);
  await page.addScriptTag({ content: script });

  const check: WebRunner['check'] = async (learner, support, tests, width, rules) => {
    try {
      return await page.evaluate(
        (args) => {
          const checker = window.__qaWeb;
          if (!checker) throw new Error('the web checker did not load');
          return checker.checkWebTask(args.learner, args.support, args.tests, args.width, args.rules);
        },
        { learner, support, tests, width, rules },
      );
    } catch (e) {
      return { passed: false, results: [], logs: [], ruleFailures: [], runtimeError: e instanceof Error ? e.message : String(e) };
    }
  };
  return { runner: { check, close: () => browser.close() } };
}
