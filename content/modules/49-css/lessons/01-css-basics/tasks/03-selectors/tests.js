const navLink = (href) => must($(`nav a[href="${href}"]`), `Посилання ${href} у меню зникло.`);
const after = (el) => window.getComputedStyle(el, '::after').getPropertyValue('content');

describe('menu', () => {
  it('menu links are #1f2937 and not underlined', () => {
    const link = navLink('/delivery');
    expect([color(link), css(link, 'text-decoration-line')]).toEqual([rgb('#1f2937'), 'none']);
  }, 'nav a { color: #1f2937; text-decoration: none; }');

  it('the current page link is bold and underlined', () => {
    const link = navLink('/catalog');
    expect([css(link, 'font-weight'), css(link, 'text-decoration-line')]).toEqual(['700', 'underline']);
    expect(css(navLink('/'), 'font-weight'), 'Жирним має бути лише поточний пункт.').toBe('400');
  }, 'Селектор [aria-current="page"]; правило має стояти нижче за nav a або бути сильнішим.');
});

describe('content', () => {
  it('only the first feature is bold', () => {
    const items = $$('.features li');
    expect(items.map((li) => css(li, 'font-weight'))).toEqual(['700', '400', '400']);
  }, '.features li:first-child { font-weight: 700; }');

  it('odd body rows have the #f3f4f6 background', () => {
    const rows = $$('tbody tr');
    expect(rows.map((tr) => color(tr, 'background-color'))).toEqual([rgb('#f3f4f6'), rgb('transparent'), rgb('#f3f4f6')]);
  }, 'tbody tr:nth-child(odd) — 1-й і 3-й рядки.');

  it('column headers are left-aligned', () => {
    expect($$('th').map((th) => css(th, 'text-align'))).toEqual(['left', 'left']);
  }, 'th { text-align: left; } — за замовчуванням заголовки по центру.');

  it('only links to other sites get " ↗"', () => {
    const external = must($('a[href^="https://"]'), 'Зовнішнє посилання зникло.');
    expect(after(external).includes('↗'), 'Після зовнішнього посилання немає ↗.').toBe(true);
    expect(after(must($('a[href="/warranty"]'), 'Посилання /warranty зникло.')), 'Внутрішнім посиланням значок не потрібен.').toBe('none');
    expect(after(navLink('/catalog'))).toBe('none');
  }, 'a[href^="https://"]::after { content: " ↗"; }');
});
