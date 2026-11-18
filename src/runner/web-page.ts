import type { WebFile, WebRule } from '../content/schema';

/**
 * Pure string helpers of web page tasks (no DOM): how the learner's files become one page, and code rules.
 * Used by the app (web.ts, WebTaskView) and by scripts/validate-content.ts in Node.
 */

/** Learner file names in a task folder → the page file they become (starter.html → index.html). */
export const LEARNER_FILE_OF: Record<string, WebFile> = {
  html: 'index.html',
  css: 'styles.css',
};

/*
 * A <link> tag: matches `<link rel="stylesheet" href="styles.css">` and `<link rel=icon href=x.png />`,
 * rejects `<linkx>` and `<a href="styles.css">`. https://regex101.com/?regex=%3Clink%5Cb%5B%5E%3E%5D*%3E&flags=gi
 */
const LINK_TAG = /<link\b[^>]*>/gi;
/*
 * rel="stylesheet" inside a tag: matches `rel="stylesheet"`, `rel='stylesheet'`, `rel=stylesheet`,
 * rejects `rel="icon"` and `rel="stylesheets"`. https://regex101.com/?regex=%5Cbrel%5Cs*%3D%5Cs*%5B%22'%5D%3Fstylesheet%5Cb(%3F!s)&flags=i
 */
const STYLESHEET_REL = /\brel\s*=\s*["']?stylesheet\b(?!s)/i;
/*
 * href pointing at the task's stylesheet: matches `href="styles.css"`, `href='./styles.css'`, `href=styles.css>`,
 * rejects `href="css/styles.css"` and `href="styles.css.bak"`.
 * https://regex101.com/?regex=%5Cbhref%5Cs*%3D%5Cs*%5B%22'%5D%3F(%3F%3A%5C.%5C%2F)%3Fstyles%5C.css(%3F%3D%5B%22'%5Cs%3E%2F%5D)&flags=i
 */
const STYLES_HREF = /\bhref\s*=\s*["']?(?:\.\/)?styles\.css(?=["'\s>/])/i;

function isStylesLink(tag: string): boolean {
  return STYLESHEET_REL.test(tag) && STYLES_HREF.test(tag);
}

/** true when the HTML loads styles.css with a <link rel="stylesheet">, the way a real page would. */
export function linksStylesheet(html: string): boolean {
  return (html.match(LINK_TAG) ?? []).some(isStylesLink);
}

/**
 * The page as the browser gets it: index.html with styles.css put in place of its <link> (like a real browser,
 * a page that does not link the stylesheet gets no styles).
 */
export function buildPage(files: Partial<Record<WebFile, string>>): string {
  const html = files['index.html'] ?? '';
  const css = files['styles.css'];
  if (css === undefined) return html;
  return html.replace(LINK_TAG, (tag) => (isStylesLink(tag) ? `<style data-file="styles.css">\n${css}\n</style>` : tag));
}

/*
 * Comments are ignored by code rules: HTML `<!-- … -->` (matches "<!-- <b>old</b> -->") and CSS `/* … *\/`
 * (matches "/* color: red; *\/"). https://regex101.com/?regex=%3C!--%5B%5Cs%5CS%5D*%3F--%3E&flags=g
 */
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
// CSS comment: matches "/* color: red; *\/", rejects "color: red;". https://regex101.com/?regex=%2F%5C*%5B%5Cs%5CS%5D*%3F%5C*%2F&flags=g
const CSS_COMMENT = /\/\*[\s\S]*?\*\//g;

export function stripWebComments(file: WebFile, code: string): string {
  return file === 'styles.css' ? code.replace(CSS_COMMENT, '') : code.replace(HTML_COMMENT, '');
}

/** Default flags of web rules: HTML and CSS are case-insensitive, and ^ / $ work per line. */
const DEFAULT_RULE_FLAGS = 'im';

/** Messages of the rules the learner's files break. A rule without `file` looks at all learner files together. */
export function evaluateWebRules(learner: Partial<Record<WebFile, string>>, rules: WebRule[]): string[] {
  const clean = (file: WebFile): string => stripWebComments(file, learner[file] ?? '');
  const files = Object.keys(learner) as WebFile[];
  return rules
    .filter((rule) => {
      const text = rule.file ? clean(rule.file) : files.map(clean).join('\n');
      /*
       * Task-defined pattern from content JSON, e.g. style\s*= (forbid inline styles):
       * matches "<p style=red>", rejects "<p class=note>".
       * https://regex101.com/?regex=style%5Cs*%3D&flags=im
       */
      const found = new RegExp(rule.pattern, rule.flags ?? DEFAULT_RULE_FLAGS).test(text);
      return rule.kind === 'require' ? !found : found;
    })
    .map((rule) => rule.message);
}
