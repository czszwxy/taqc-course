/**
 * Accessibility helpers for web page tasks: the role and the accessible name of an element, close to what a
 * browser puts into the accessibility tree (simplified HTML-AAM + accname). Pure DOM code: it works on the
 * rendered page in the app's iframe and in the validator's Chromium. Never uses `instanceof` (the page is
 * another window, so its elements are not instances of this window's HTMLElement).
 */

/*
 * Whitespace runs: matches "  \n\t" in "Add \n\t to cart", rejects nothing visible.
 * https://regex101.com/?regex=%5Cs%2B&flags=g
 */
const WHITESPACE = /\s+/g;

/** Text with runs of whitespace turned into one space, trimmed — the way a screen reader reads it. */
export function cleanText(value: string): string {
  return value.replace(WHITESPACE, ' ').trim();
}

const tag = (el: Element): string => el.localName;

function attr(el: Element, name: string): string | null {
  return el.getAttribute(name);
}

/** hidden, aria-hidden="true", display: none or visibility: hidden — the element is not in the accessibility tree. */
export function isHidden(el: Element): boolean {
  const view = el.ownerDocument.defaultView;
  const own = view?.getComputedStyle(el);
  if (own?.visibility === 'hidden' || own?.visibility === 'collapse') return true;
  const chain = (node: Element | null): Element[] => (node ? [node, ...chain(node.parentElement)] : []);
  return chain(el).some(
    (node) => node.hasAttribute('hidden') || attr(node, 'aria-hidden') === 'true' || view?.getComputedStyle(node).display === 'none',
  );
}

/** Sections inside which <header> / <footer> are no longer the page's banner / contentinfo. */
const SECTIONING = new Set(['article', 'aside', 'main', 'nav', 'section']);

function insideSectioning(el: Element): boolean {
  const parent = el.parentElement;
  if (!parent) return false;
  return SECTIONING.has(tag(parent)) || insideSectioning(parent);
}

const INPUT_ROLE: Record<string, string> = {
  button: 'button',
  submit: 'button',
  reset: 'button',
  image: 'button',
  checkbox: 'checkbox',
  radio: 'radio',
  range: 'slider',
  number: 'spinbutton',
  search: 'searchbox',
  email: 'textbox',
  tel: 'textbox',
  text: 'textbox',
  url: 'textbox',
};

/** Elements with one fixed implicit role. */
const FIXED_ROLE: Record<string, string> = {
  article: 'article',
  aside: 'complementary',
  blockquote: 'blockquote',
  button: 'button',
  caption: 'caption',
  code: 'code',
  del: 'deletion',
  details: 'group',
  dialog: 'dialog',
  div: 'generic',
  em: 'emphasis',
  fieldset: 'group',
  figure: 'figure',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  hr: 'separator',
  ins: 'insertion',
  li: 'listitem',
  main: 'main',
  menu: 'list',
  meter: 'meter',
  nav: 'navigation',
  ol: 'list',
  option: 'option',
  output: 'status',
  p: 'paragraph',
  progress: 'progressbar',
  search: 'search',
  span: 'generic',
  strong: 'strong',
  table: 'table',
  tbody: 'rowgroup',
  td: 'cell',
  textarea: 'textbox',
  tfoot: 'rowgroup',
  thead: 'rowgroup',
  time: 'time',
  tr: 'row',
  ul: 'list',
};

function headerCellRole(el: Element): string {
  const scope = attr(el, 'scope')?.toLowerCase();
  if (scope === 'row' || scope === 'rowgroup') return 'rowheader';
  if (scope === 'col' || scope === 'colgroup') return 'columnheader';
  // Without scope: a header cell in <thead> or in a row of header cells heads a column, otherwise a row.
  const row = el.parentElement;
  const inHead = row?.parentElement ? tag(row.parentElement) === 'thead' : false;
  const allHeaders = row ? Array.from(row.children).every((cell) => tag(cell) === 'th') : false;
  return inHead || allHeaders ? 'columnheader' : 'rowheader';
}

/**
 * A name given by the author (aria-labelledby, aria-label or title). <section> and <form> become the region / form
 * landmarks only with such a name — their text content does not count (and asking for the full name here would recurse).
 */
function hasAuthorName(el: Element): boolean {
  const labelledBy = (attr(el, 'aria-labelledby') ?? '').split(' ').filter(Boolean);
  const referenced = labelledBy.some((id) => cleanText(el.ownerDocument.getElementById(id)?.textContent ?? '') !== '');
  return referenced || Boolean(attr(el, 'aria-label')?.trim()) || Boolean(attr(el, 'title')?.trim());
}

/** Implicit role from the element itself, or null when HTML gives it none. */
function implicitRole(el: Element): string | null {
  const name = tag(el);
  const fixed = FIXED_ROLE[name];
  if (fixed) return fixed;
  if (name === 'a' || name === 'area') return el.hasAttribute('href') ? 'link' : 'generic';
  if (name === 'img') return attr(el, 'alt') === '' ? 'none' : 'img';
  if (name === 'header') return insideSectioning(el) ? 'generic' : 'banner';
  if (name === 'footer') return insideSectioning(el) ? 'generic' : 'contentinfo';
  if (name === 'section') return hasAuthorName(el) ? 'region' : 'generic';
  if (name === 'form') return hasAuthorName(el) ? 'form' : null;
  if (name === 'th') return headerCellRole(el);
  if (name === 'select') return el.hasAttribute('multiple') || Number(attr(el, 'size') ?? '1') > 1 ? 'listbox' : 'combobox';
  if (name === 'input') {
    const type = (attr(el, 'type') ?? 'text').toLowerCase();
    const textual = INPUT_ROLE[type] === 'textbox' || type === 'search';
    if (textual && el.hasAttribute('list')) return 'combobox';
    return INPUT_ROLE[type] ?? null;
  }
  return null;
}

/** The role an assistive technology gets: the first word of role="…" or the implicit role (null = none). */
export function role(el: Element): string | null {
  const explicit = attr(el, 'role')?.trim().toLowerCase().split(' ')[0];
  if (explicit === 'presentation') return 'none';
  return explicit || implicitRole(el);
}

/** Roles that take their name from their content (button text, link text, heading text…). */
const NAME_FROM_CONTENT = new Set([
  'button',
  'cell',
  'checkbox',
  'columnheader',
  'gridcell',
  'heading',
  'link',
  'menuitem',
  'option',
  'radio',
  'row',
  'rowheader',
  'switch',
  'tab',
  'tooltip',
  'treeitem',
]);

const TEXT_INPUT_TYPES = new Set(['text', 'email', 'tel', 'url', 'search', 'number', 'password']);
const BUTTON_INPUT_DEFAULT: Record<string, string> = { submit: 'Submit', reset: 'Reset', button: '' };
const LABELABLE = new Set(['input', 'select', 'textarea', 'meter', 'progress', 'output']);

interface NameContext {
  visited: Set<Element>;
  /** Inside an aria-labelledby reference: no second level of aria-labelledby. */
  labelledBy: boolean;
  /** Inside the content of an element whose name comes from its content: every descendant contributes. */
  content: boolean;
}

/** What a form control inside a label or a button contributes: a text field's value, a select's chosen option. */
function embeddedValue(el: Element): string {
  if (tag(el) === 'select') {
    const options = Array.from(el.querySelectorAll('option'));
    const chosen = options.find((o) => o.hasAttribute('selected')) ?? options[0];
    return chosen?.textContent ?? '';
  }
  const type = (attr(el, 'type') ?? 'text').toLowerCase();
  if (tag(el) === 'textarea' || TEXT_INPUT_TYPES.has(type)) return (el as HTMLInputElement).value ?? '';
  return '';
}

function isInline(el: Element): boolean {
  const display = el.ownerDocument.defaultView?.getComputedStyle(el).display ?? 'inline';
  return display.startsWith('inline') || display === 'contents';
}

function nameFromContent(el: Element, ctx: NameContext): string {
  return Array.from(el.childNodes)
    .map((node) => {
      if (node.nodeType === node.TEXT_NODE) return node.textContent ?? '';
      if (node.nodeType !== node.ELEMENT_NODE) return '';
      const child = node as Element;
      if (isHidden(child)) return '';
      if (LABELABLE.has(tag(child)) && !ctx.visited.has(child)) return embeddedValue(child);
      const part = computeName(child, { ...ctx, content: true });
      return isInline(child) ? part : ` ${part} `;
    })
    .join('');
}

function labelsText(el: Element, ctx: NameContext): string {
  const labels = Array.from((el as HTMLInputElement).labels ?? []);
  return cleanText(labels.map((label) => computeName(label, { ...ctx, content: true })).join(' '));
}

function childText(el: Element, childTag: string): string | undefined {
  const child = Array.from(el.children).find((c) => tag(c) === childTag);
  return child ? (child.textContent ?? '') : undefined;
}

/** Name from the HTML itself (labels, alt, legend, caption…); undefined = HTML gives none, try content / title. */
function nativeName(el: Element, ctx: NameContext): string | undefined {
  const name = tag(el);
  if (name === 'img' || name === 'area') return attr(el, 'alt') ?? undefined;
  if (name === 'fieldset') return childText(el, 'legend');
  if (name === 'table') return childText(el, 'caption');
  if (name === 'figure') return childText(el, 'figcaption');
  if (name === 'input') {
    const type = (attr(el, 'type') ?? 'text').toLowerCase();
    if (type === 'hidden') return '';
    if (type in BUTTON_INPUT_DEFAULT) return attr(el, 'value') ?? BUTTON_INPUT_DEFAULT[type];
    if (type === 'image') return attr(el, 'alt') ?? attr(el, 'value') ?? 'Submit';
  }
  if (!LABELABLE.has(name)) return undefined;
  return labelsText(el, ctx) || attr(el, 'title') || attr(el, 'placeholder') || undefined;
}

function computeName(el: Element, ctx: NameContext): string {
  if (ctx.visited.has(el)) return '';
  ctx.visited.add(el);
  if (!ctx.labelledBy) {
    const ids = (attr(el, 'aria-labelledby') ?? '').split(' ').filter(Boolean);
    const refs = ids.map((id) => el.ownerDocument.getElementById(id)).filter((ref): ref is HTMLElement => ref !== null);
    if (refs.length > 0) return refs.map((ref) => computeName(ref, { ...ctx, labelledBy: true, content: true })).join(' ');
  }
  const ariaLabel = attr(el, 'aria-label')?.trim();
  if (ariaLabel) return ariaLabel;
  const native = nativeName(el, ctx);
  if (native !== undefined) return native;
  const fromContent = ctx.content || ctx.labelledBy || NAME_FROM_CONTENT.has(role(el) ?? '');
  const content = fromContent ? cleanText(nameFromContent(el, ctx)) : '';
  return content || attr(el, 'title') || '';
}

/**
 * The accessible name: what a screen reader says for the element ("Add to cart, button").
 * Order: aria-labelledby → aria-label → HTML (label, alt, legend, caption…) → content (for buttons, links, headings…) → title.
 */
export function accessibleName(el: Element): string {
  return cleanText(computeName(el, { visited: new Set(), labelledBy: false, content: false }));
}

/** ARIA's level of a role="heading" element without aria-level. */
const DEFAULT_ARIA_HEADING_LEVEL = '2';

/*
 * Heading tag names: matches "h1" … "h6", rejects "header" and "h7". https://regex101.com/?regex=%5Eh(%5B1-6%5D)%24
 */
const HEADING_TAG = /^h([1-6])$/;

/** Headings of the page in document order (h1–h6 and role="heading" with aria-level), as the outline a screen reader lists. */
export function headings(doc: Document): { level: number; text: string }[] {
  return Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]'))
    .filter((el) => !isHidden(el))
    .map((el) => {
      const level = HEADING_TAG.exec(tag(el))?.[1] ?? attr(el, 'aria-level') ?? DEFAULT_ARIA_HEADING_LEVEL;
      return { level: Number(level), text: accessibleName(el) };
    });
}

/** The accessible description: the text of the elements aria-describedby points to (hints, error messages). */
export function accessibleDescription(el: Element): string {
  const ids = (attr(el, 'aria-describedby') ?? '').split(' ').filter(Boolean);
  return cleanText(ids.map((id) => el.ownerDocument.getElementById(id)?.textContent ?? '').join(' '));
}
