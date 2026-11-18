const el = (selector) => must($(selector), `Немає ${selector}.`);
const rootRules = () => cssRules().filter((rule) => rule.selector.split(',').some((part) => [':root', 'html'].includes(part.trim())));
const tokens = (rule) => Array.from(rule.style).filter((name) => name.startsWith('--')).map((name) => [name, rule.style.getPropertyValue(name).trim()]);
const isDark = (media) => /prefers-color-scheme:\s*dark/.test(media || '');
const isPrint = (media) => /(^|[\s,(])print\b/.test(media || '');
const forScreenOnly = (media) => /\bscreen\b/.test(media || '');
// Підставляє значення змінних з правил (у порядку файлу) прямо в <html>: так перевірка не залежить від теми системи.
const applyTokens = (rules) => {
  const root = document.documentElement;
  const pairs = rules.flatMap(tokens);
  pairs.forEach(([name, value]) => root.style.setProperty(name, value));
  return () => pairs.forEach(([name]) => root.style.removeProperty(name));
};
const withTokens = (rules, check) => {
  const restore = applyTokens(rules);
  try {
    check();
  } finally {
    restore();
  }
};
const safeMatches = (node, selector) => {
  try {
    return node.matches(selector);
  } catch {
    return false;
  }
};
const printRules = () => cssRules().filter((rule) => isPrint(rule.media));

describe('light and dark', () => {
  it(':root declares color-scheme: light dark', () => {
    expect(css(document.documentElement, 'color-scheme')).toBe('light dark');
  }, ':root { color-scheme: light dark; } — браузер перефарбує поля й скролбари.');

  it('the light theme stays as it was', () => {
    withTokens(rootRules().filter((rule) => !rule.media), () => {
      expect([color(document.body, 'background-color'), color(document.body), color(el('.summary'), 'background-color')], 'Поза медіазапитами змінні мають лишитися світлими').toEqual([rgb('#ffffff'), rgb('#1f2937'), rgb('#f3f4f6')]);
    });
  }, 'Темні значення — лише всередині @media (prefers-color-scheme: dark).');

  it('the dark theme gives the variables new values', () => {
    expect(rootRules().some((rule) => isDark(rule.media)), 'Немає :root { … } усередині @media (prefers-color-scheme: dark).').toBe(true);
    withTokens(rootRules().filter((rule) => !rule.media || isDark(rule.media)), () => {
      expect([color(document.body, 'background-color'), color(document.body), color(el('.summary'), 'background-color')], 'Фон, текст і фон .summary у темній темі').toEqual([rgb('#111827'), rgb('#f9fafb'), rgb('#1f2937')]);
    });
  }, '@media (prefers-color-scheme: dark) { :root { --color-bg: #111827; --color-text: #f9fafb; --color-surface: #1f2937; … } }');

  it('every text stays readable in the dark theme (4.5 : 1)', () => {
    withTokens(rootRules().filter((rule) => !rule.media || isDark(rule.media)), () => {
      const low = ['h1', '.page > .muted', '.summary dt', '.summary a', '.site-nav a', '.print-button', '.site-footer p']
        .map((selector) => [selector, contrast(el(selector))])
        .filter(([, ratio]) => ratio < 4.5)
        .map(([selector, ratio]) => `${selector}: ${ratio}`);
      expect(low, 'У темній темі контраст менше 4.5 : 1').toEqual([]);
    });
  }, 'Візьми значення з таблиці: світлий текст і посилання на темному фоні.');
});

describe('print', () => {
  it('the navigation, the button and the footer are not printed', () => {
    const targets = ['.site-nav', '.print-button', '.site-footer'];
    const hiddenInPrint = (selector) => printRules().some((rule) => safeMatches(el(selector), rule.selector) && rule.style.getPropertyValue('display') === 'none');
    expect(targets.filter((selector) => !hiddenInPrint(selector)), 'У @media print не сховано').toEqual([]);
    expect(targets.filter((selector) => isHidden(el(selector))), 'Сховано й на екрані — display: none має бути лише в @media print').toEqual([]);
  }, '@media print { .site-nav, .print-button, .site-footer { display: none; } }');

  it('links in .summary are printed with their address', () => {
    const link = el('.summary a');
    const after = printRules().find((rule) => rule.selector.split(',').map((part) => part.trim()).some((part) => /::?after$/.test(part) && safeMatches(link, part.replace(/::?after$/, ''))));
    expect(Boolean(after) && after.style.getPropertyValue('content').includes('attr(href)'), 'Немає правила ::after з content: attr(href) для посилань у .summary (усередині @media print).').toBe(true);
  }, '@media print { .summary a::after { content: " (" attr(href) ")"; } }');

  it('black text on white paper, even with a dark system theme', () => {
    const appliesInPrint = (rule) => !rule.media || isPrint(rule.media) || (isDark(rule.media) && !forScreenOnly(rule.media));
    withTokens(rootRules().filter(appliesInPrint), () => {
      expect([color(document.body), color(document.body, 'background-color')], 'Друк з темною темою в системі: текст і фон').toEqual([rgb('#000000'), rgb('#ffffff')]);
    });
  }, '@media print { :root { --color-bg: #ffffff; --color-text: #000000; … } } — нижче за темну тему: при однаковій специфічності перемагає останнє правило.');
});
