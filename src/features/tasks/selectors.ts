import type { SelectorChallenge, SelectorTask } from '../../content/schema';

/**
 * Pure helpers for selector tasks. They work with any DOM `Document`:
 * the browser's DOMParser in the app and jsdom in scripts/validate-content.ts.
 */

export const EXPECT_ATTR = 'data-expect';
export const HIT_ATTR = 'data-qa-hit';

/** XPathResult.ORDERED_NODE_SNAPSHOT_TYPE — the global XPathResult object is not available everywhere. */
const ORDERED_NODE_SNAPSHOT_TYPE = 7;
const ELEMENT_NODE = 1;

/**
 * Removes target markers from the raw HTML shown to the learner.
 * Matches: ` data-expect="titles prices"` · Rejects: `data-expected="x"`, `data-test="x"`
 * https://regex101.com/?regex=%5Cs%2Bdata-expect%3D%22%5B%5E%22%5D*%22&flags=g
 */
const EXPECT_MARKER_RE = /\s+data-expect="[^"]*"/g;

export function displaySource(html: string): string {
  return html.replace(EXPECT_MARKER_RE, '').trim();
}

function markerIds(el: Element): string[] {
  return (el.getAttribute(EXPECT_ATTR) ?? '').split(' ').filter(Boolean);
}

/** Collects the marked target elements per challenge id and strips the markers from `doc`. */
export function prepareSnippet(doc: Document): Map<string, Element[]> {
  const marked = Array.from(doc.querySelectorAll(`[${EXPECT_ATTR}]`));
  const expected = marked
    .flatMap((el) => markerIds(el).map((id) => ({ id, el })))
    .reduce((map, { id, el }) => map.set(id, [...(map.get(id) ?? []), el]), new Map<string, Element[]>());
  marked.forEach((el) => el.removeAttribute(EXPECT_ATTR));
  return expected;
}

export type SelectorRun = { ok: true; elements: Element[] } | { ok: false; error: string };

function evaluateXPath(doc: Document, expression: string): SelectorRun {
  const result = doc.evaluate(expression, doc, null, ORDERED_NODE_SNAPSHOT_TYPE, null);
  const nodes = Array.from({ length: result.snapshotLength }, (_, i) => result.snapshotItem(i));
  const onlyElements = nodes.every((n) => n?.nodeType === ELEMENT_NODE);
  if (!onlyElements) return { ok: false, error: 'The XPath must select elements, not text or attributes (remove /text() or /@attr at the end).' };
  return { ok: true, elements: nodes as Element[] };
}

const INVALID_MESSAGE: Record<SelectorTask['syntax'], string> = {
  css: 'This is not a valid CSS selector. Check brackets, quotes and special characters.',
  xpath: 'This is not a valid XPath expression. Check slashes, brackets and quotes.',
};

export function runSelector(doc: Document, syntax: SelectorTask['syntax'], selector: string): SelectorRun {
  const trimmed = selector.trim();
  if (!trimmed) return { ok: false, error: 'Enter a selector.' };
  try {
    return syntax === 'css' ? { ok: true, elements: Array.from(doc.querySelectorAll(trimmed)) } : evaluateXPath(doc, trimmed);
  } catch {
    return { ok: false, error: INVALID_MESSAGE[syntax] };
  }
}

export type ChallengeStatus = 'correct' | 'wrong' | 'invalid' | 'rule';

export interface ChallengeResult {
  status: ChallengeStatus;
  message: string;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export function checkChallenge(doc: Document, syntax: SelectorTask['syntax'], challenge: SelectorChallenge, expected: Element[], selector: string): ChallengeResult {
  const run = runSelector(doc, syntax, selector);
  if (!run.ok) return { status: 'invalid', message: run.error };

  const extra = run.elements.filter((el) => !expected.includes(el)).length;
  const missing = expected.filter((el) => !run.elements.includes(el)).length;
  if (extra > 0 || missing > 0) {
    const details = [extra > 0 ? `${plural(extra, 'extra element')} selected` : '', missing > 0 ? `${plural(missing, 'target')} missing` : ''].filter(Boolean);
    return { status: 'wrong', message: `Matches ${plural(run.elements.length, 'element')}: ${details.join(', ')}.` };
  }

  /*
   * Task-defined rule pattern from content JSON, e.g. "nth-child" (forbid):
   * matches "li:nth-child(2)", rejects "li.active".
   * https://regex101.com/?regex=nth-child&flags=i
   */
  const broken = challenge.rules.find((r) => (r.kind === 'require') !== new RegExp(r.pattern, r.flags ?? 'i').test(selector));
  if (broken) return { status: 'rule', message: broken.message };
  return { status: 'correct', message: `Matches exactly the ${plural(expected.length, 'target element')}.` };
}

const PREVIEW_STYLE = `
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 14px; color: #1f2937; margin: 12px; line-height: 1.45; }
  [${HIT_ATTR}] { outline: 3px solid #f59e0b !important; outline-offset: 2px; background-color: rgba(245, 158, 11, 0.18) !important; }
`;

/** Full HTML for a sandboxed iframe, with the currently matched elements highlighted. */
export function previewDocument(doc: Document, hits: Element[]): string {
  hits.forEach((el) => el.setAttribute(HIT_ATTR, ''));
  const html = doc.documentElement.outerHTML;
  hits.forEach((el) => el.removeAttribute(HIT_ATTR));
  return html.replace('<head>', `<head><style>${PREVIEW_STYLE}</style>`);
}
