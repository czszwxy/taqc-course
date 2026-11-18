/**
 * CSS helpers for the checks of web page tasks (module 49+): colors in one format, WCAG contrast of text,
 * and the page's CSS rules as a flat list. They run in the window that checks the page (the app or the
 * validator's Chromium); colors are resolved by drawing them on a 1×1 canvas of that window, so every syntax
 * the browser understands (#hex, rgb, hsl, named, oklch…) gives the same numbers.
 */

/** r, g, b in 0–255 and alpha in 0–1. */
export type Rgba = [number, number, number, number];

const CHANNEL_MAX = 255;
const ALPHA_DIGITS = 2;
/** WCAG 2 relative luminance: sRGB channel linearisation and the channel weights. */
const SRGB_LINEAR_LIMIT = 0.04045;
const SRGB_LINEAR_DIVISOR = 12.92;
const SRGB_OFFSET = 0.055;
const SRGB_SCALE = 1.055;
const SRGB_GAMMA = 2.4;
const RED_WEIGHT = 0.2126;
const GREEN_WEIGHT = 0.7152;
const BLUE_WEIGHT = 0.0722;
/** WCAG contrast ratio = (lighter + 0.05) / (darker + 0.05). */
const CONTRAST_FLARE = 0.05;
const CONTRAST_DIGITS = 2;
/** What is under the page: browsers paint a white canvas behind a page without a background. */
const PAGE_CANVAS: Rgba = [CHANNEL_MAX, CHANNEL_MAX, CHANNEL_MAX, 1];

let paintContext: CanvasRenderingContext2D | null = null;

function context(): CanvasRenderingContext2D {
  if (!paintContext) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    paintContext = canvas.getContext('2d', { willReadFrequently: true });
  }
  if (!paintContext) throw new Error('Canvas is not available to resolve colors.');
  return paintContext;
}

/** Any CSS color → [r, g, b, a]. Unknown values give transparent black. */
export function toRgba(value: string): Rgba {
  const ctx = context();
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = 'transparent';
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0, a = 0] = Array.from(ctx.getImageData(0, 0, 1, 1).data);
  return [r, g, b, Number((a / CHANNEL_MAX).toFixed(ALPHA_DIGITS))];
}

/** A color as "rgb(29, 78, 216)" (or "rgba(…, 0.5)" when translucent) — easy to compare in checks. */
export function formatRgba([r, g, b, a]: Rgba): string {
  return a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** `top` painted over `under` (both colors; the result is opaque when `under` is). */
function blend(under: Rgba, top: Rgba): Rgba {
  const [r, g, b, a] = top;
  const mix = (topChannel: number, underChannel: number): number => Math.round(topChannel * a + underChannel * (1 - a));
  return [mix(r, under[0]), mix(g, under[1]), mix(b, under[2]), 1];
}

/** The background actually behind `el`: its own and its ancestors' background colors over the white page. */
export function backgroundBehind(el: Element): Rgba {
  const view = el.ownerDocument.defaultView;
  const chain = (node: Element | null): Element[] => (node ? [node, ...chain(node.parentElement)] : []);
  const layers = chain(el).map((node) => toRgba(view?.getComputedStyle(node).backgroundColor ?? 'transparent'));
  const firstOpaque = layers.findIndex((layer) => layer[3] >= 1);
  const visible = (firstOpaque === -1 ? layers : layers.slice(0, firstOpaque + 1)).filter((layer) => layer[3] > 0);
  return visible.reverse().reduce(blend, PAGE_CANVAS);
}

function luminance([r, g, b]: Rgba): number {
  const linear = (channel: number): number => {
    const c = channel / CHANNEL_MAX;
    return c <= SRGB_LINEAR_LIMIT ? c / SRGB_LINEAR_DIVISOR : ((c + SRGB_OFFSET) / SRGB_SCALE) ** SRGB_GAMMA;
  };
  return RED_WEIGHT * linear(r) + GREEN_WEIGHT * linear(g) + BLUE_WEIGHT * linear(b);
}

/** WCAG contrast ratio of two colors, e.g. 4.54 (1 = no contrast, 21 = black on white). */
export function contrastRatio(a: Rgba, b: Rgba): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Number(((light + CONTRAST_FLARE) / (dark + CONTRAST_FLARE)).toFixed(CONTRAST_DIGITS));
}

/** Contrast of the element's text color with the background behind it. */
export function textContrast(el: Element): number {
  const background = backgroundBehind(el);
  const color = toRgba(el.ownerDocument.defaultView?.getComputedStyle(el).color ?? 'black');
  return contrastRatio(blend(background, color), background);
}

export interface CssRuleInfo {
  /** e.g. ".btn:focus-visible" */
  selector: string;
  /** The rule's declarations: style.getPropertyValue('outline-width'). */
  style: CSSStyleDeclaration;
  /** Media query the rule sits in, e.g. "(prefers-reduced-motion: reduce)", or null. */
  media: string | null;
}

function flattenRules(list: CSSRuleList, media: string | null): CssRuleInfo[] {
  return Array.from(list).flatMap((rule): CssRuleInfo[] => {
    const style = rule as CSSStyleRule;
    const own: CssRuleInfo[] = 'selectorText' in rule ? [{ selector: style.selectorText, style: style.style, media }] : [];
    const mediaRule = rule as CSSMediaRule;
    const childMedia = 'media' in rule && 'conditionText' in rule ? mediaRule.media.mediaText : media;
    const grouping = rule as CSSGroupingRule;
    const children = 'cssRules' in rule ? flattenRules(grouping.cssRules, childMedia) : [];
    return [...own, ...children];
  });
}

/** Every style rule of the page (inside @media / @supports / nesting too), in source order. */
export function cssRules(doc: Document): CssRuleInfo[] {
  return Array.from(doc.styleSheets).flatMap((sheet) => flattenRules(sheet.cssRules, null));
}

/** Attribute that stands in for "this element has focus" in the copied focus rules. */
const FOCUS_MARK = 'data-qa-focus';

/*
 * Focus pseudo-classes in a selector: matches ":focus", ":focus-visible" and ":focus-within" in
 * ".skip-link:focus, a:focus-visible, li:focus-within", rejects ":focused" and ":hover".
 * https://regex101.com/?regex=%3Afocus(-visible%7C-within)%3F(%3F!%5B%5Cw-%5D)&flags=g
 */
const FOCUS_PSEUDO = /:focus(-visible|-within)?(?![\w-])/g;

function markFocus(selector: string): string {
  return selector.replace(FOCUS_PSEUDO, (_match, kind: string | undefined) =>
    kind === '-within' ? `:has([${FOCUS_MARK}])` : `[${FOCUS_MARK}]`,
  );
}

/**
 * Shows `el` the way it looks with keyboard focus, without moving the real focus: copies every :focus /
 * :focus-visible rule of the page with the pseudo-class replaced by an attribute, appends the copies (so they win
 * like the originals would) and marks the element. Real focus only paints when the window itself has focus, and
 * it would also pull focus out of the editor. Returns a function that undoes it.
 */
export function simulateFocus(doc: Document, el: Element): () => void {
  const copies = cssRules(doc)
    // search() ignores the regex's lastIndex, unlike test() with the global flag.
    .filter((rule) => rule.selector.search(FOCUS_PSEUDO) !== -1)
    .map((rule) => {
      const css = `${markFocus(rule.selector)} { ${rule.style.cssText} }`;
      return rule.media ? `@media ${rule.media} { ${css} }` : css;
    });
  const style = doc.createElement('style');
  style.textContent = copies.join('\n');
  doc.head.append(style);
  // The focused look applies at once: a transition would still be running when the check measures it.
  const savedStyle = el.getAttribute('style');
  el.setAttribute('style', `${savedStyle ? `${savedStyle};` : ''}transition: none !important`);
  el.setAttribute(FOCUS_MARK, '');
  return () => {
    el.removeAttribute(FOCUS_MARK);
    if (savedStyle === null) el.removeAttribute('style');
    else el.setAttribute('style', savedStyle);
    style.remove();
  };
}
