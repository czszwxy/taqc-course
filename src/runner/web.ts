import { executeModules, type ExecOutput } from './harness';
import { accessibleDescription, accessibleName, cleanText, headings, isHidden, role } from './web-a11y';
import { cssRules, formatRgba, simulateFocus, textContrast, toRgba } from './web-css';
import { buildPage, evaluateWebRules } from './web-page';
import type { WebFile, WebRule } from '../content/schema';

/**
 * Runs the hidden checks of a web page task (tests.js) against the rendered page.
 * The page is an iframe with `sandbox="allow-same-origin"`: its own scripts never run, but this window can read
 * its DOM, computed styles and layout. The checks run here (main thread) through the same harness as code tasks,
 * with `document` / `window` of the page and a few helpers as globals. Used by the app (WebTaskView) and, bundled
 * with esbuild, by scripts/web-node.ts inside the validator's Chromium — one code path for both.
 */

const TESTS_ENTRY = '/tests.js';
/** Height of the hidden page the checks run on (CSS pixels). */
export const CHECK_FRAME_HEIGHT = 768;
/** A page that has not loaded after this long is reported as broken. */
const FRAME_LOAD_TIMEOUT_MS = 10_000;
/** The checks of one task must finish within this time (a hanging async check is stopped). */
const CHECK_TIMEOUT_MS = 10_000;

/** Off-screen: the page lays out at its real size, but the learner never sees it. */
const HIDDEN_FRAME_STYLE = 'position:fixed;left:-20000px;top:0;border:0;pointer-events:none;';

/**
 * Applies a size change of the frame right away: reading layout makes the browser lay out the parent (new frame
 * size) and the page in it, media queries included. No requestAnimationFrame — browsers pause it in background
 * tabs, and a Check must not hang because the learner switched tabs.
 */
function applyLayout(frame: HTMLIFrameElement, doc: Document): Promise<void> {
  void frame.getBoundingClientRect();
  void doc.documentElement.getBoundingClientRect();
  return Promise.resolve();
}

function waitForLoad(frame: HTMLIFrameElement): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), FRAME_LOAD_TIMEOUT_MS);
    frame.addEventListener(
      'load',
      () => {
        clearTimeout(timer);
        resolve(true);
      },
      { once: true },
    );
  });
}

/** `value`, or a failed check with `message` when it is missing (e.g. `must($('h1'), 'The page has no <h1>.')`). */
function must<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) throw Object.assign(new Error(message), { name: 'Missing' });
  return value;
}

/** Globals the checks see: the page's document and window plus small helpers (documented in CLAUDE.md). */
function checkGlobals(frame: HTMLIFrameElement, doc: Document, win: Window): Record<string, unknown> {
  return {
    document: doc,
    window: win,
    must,
    $: (selector: string) => doc.querySelector(selector),
    $$: (selector: string) => Array.from(doc.querySelectorAll(selector)),
    text: (el: Element | null) => cleanText(el?.textContent ?? ''),
    css: (el: Element, property: string) => win.getComputedStyle(el).getPropertyValue(property),
    box: (el: Element) => el.getBoundingClientRect(),
    /** A color property as "rgb(r, g, b)" whatever syntax the CSS used, e.g. color(btn, 'background-color'). */
    color: (el: Element, property = 'color') => formatRgba(toRgba(win.getComputedStyle(el).getPropertyValue(property))),
    /** Any CSS color written in a check ("#1d4ed8") in the same "rgb(…)" format. */
    rgb: (value: string) => formatRgba(toRgba(value)),
    contrast: textContrast,
    cssRules: () => cssRules(doc),
    role,
    accessibleName,
    accessibleDescription,
    isHidden,
    headings: () => headings(doc),
    simulateFocus: (el: Element) => simulateFocus(doc, el),
    /** Resizes the page (like turning a phone or resizing the window) and waits for the new layout. */
    setViewport: async (width: number, height: number = CHECK_FRAME_HEIGHT) => {
      frame.style.setProperty('width', `${width}px`);
      frame.style.setProperty('height', `${height}px`);
      await applyLayout(frame, doc);
    },
  };
}

function withTimeout(run: Promise<ExecOutput>): Promise<ExecOutput> {
  const stop = new Promise<ExecOutput>((resolve) => setTimeout(() => resolve({ results: [], logs: [], timedOut: true }), CHECK_TIMEOUT_MS));
  return Promise.race([run, stop]);
}

/** Renders `page` (full HTML) in a hidden iframe of `width` CSS pixels and runs the checks in `tests` on it. */
export async function checkInFrame(page: string, tests: string, width: number): Promise<ExecOutput> {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-same-origin');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.cssText = `${HIDDEN_FRAME_STYLE}width:${width}px;height:${CHECK_FRAME_HEIGHT}px;`;
  frame.srcdoc = page;
  const loaded = waitForLoad(frame);
  document.body.append(frame);
  try {
    const ok = await loaded;
    // Read the document only after "load": before it the frame still holds its empty initial about:blank document.
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!ok || !doc || !win) return { results: [], logs: [], runtimeError: 'The page did not open.' };
    // Classic scrollbars (Windows) take ~15px of the width, overlay ones (phones, macOS, headless) take none:
    // hide the page's scrollbar so layout checks measure the same width everywhere. Scrolling still works.
    doc.documentElement.style.setProperty('scrollbar-width', 'none');
    return await withTimeout(executeModules({ modules: { [TESTS_ENTRY]: tests }, entry: TESTS_ENTRY, collectTests: true }, checkGlobals(frame, doc, win)));
  } finally {
    frame.remove();
  }
}

export interface WebCheckResult extends ExecOutput {
  passed: boolean;
  /** Messages of the task's code rules the learner's files break. */
  ruleFailures: string[];
}

/** Checks a web page task: code rules on the learner's files, then the hidden checks on the page built from all files. */
export async function checkWebTask(
  learner: Partial<Record<WebFile, string>>,
  support: Partial<Record<WebFile, string>>,
  tests: string,
  width: number,
  rules: WebRule[],
): Promise<WebCheckResult> {
  const ruleFailures = evaluateWebRules(learner, rules);
  const run = await checkInFrame(buildPage({ ...support, ...learner }), tests, width);
  const allGreen = run.results.length > 0 && run.results.every((r) => r.passed);
  return { ...run, ruleFailures, passed: allGreen && ruleFailures.length === 0 && !run.runtimeError && !run.timedOut };
}
