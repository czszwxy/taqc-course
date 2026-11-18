const header = () => must($('.site-header'), 'Шапка зникла.');
const logo = () => must($('.logo'), 'Логотип зник.');
const nav = () => must($('nav'), 'Меню зникло.');
const cart = () => must($('.cart'), 'Кошик зник.');
const middle = (el) => box(el).top + box(el).height / 2;
/** Middle of the text itself (a stretched flex item is taller than its text). */
function contentMiddle(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const b = range.getBoundingClientRect();
  return b.top + b.height / 2;
}
const near = (a, b, delta = 1.5) => Math.abs(a - b) <= delta;

describe('header', () => {
  it('logo, menu and cart stand in one row, centered vertically', () => {
    expect(css(header(), 'display'), 'Шапка має бути flex-контейнером.').toBe('flex');
    const img = must($('.logo img'), 'Картинка логотипа зникла.');
    const firstLink = must($('.menu a'), 'Посилання меню зникли.');
    expect(near(middle(img), contentMiddle(firstLink), 3) && near(contentMiddle(firstLink), contentMiddle(cart()), 1.5), 'Логотип, меню й кошик не на одній осі по вертикалі: align-items: center.').toBe(true);
    expect(box(logo()).right < box(nav()).left && box(nav()).right < box(cart()).left, 'Порядок зліва направо: логотип, меню, кошик.').toBe(true);
  }, '.site-header { display: flex; align-items: center; }');

  it('there is a 32px gap after the logo', () => {
    const gap = box(nav()).left - box(logo()).right;
    expect(near(gap, 32, 1), `Між логотипом і меню ${Math.round(gap)}px.`).toBe(true);
  }, 'gap: 32px на .site-header.');

  it('padding 12px 24px and a 1px #e5e7eb bottom border', () => {
    expect([css(header(), 'padding-top'), css(header(), 'padding-left'), css(header(), 'border-bottom-width'), css(header(), 'border-bottom-style'), color(header(), 'border-bottom-color')]).toEqual(['12px', '24px', '1px', 'solid', rgb('#e5e7eb')]);
  }, 'padding: 12px 24px; border-bottom: 1px solid #e5e7eb;');

  it('the cart is pushed to the right edge', () => {
    const right = box(header()).right - box(cart()).right;
    expect(near(right, 24, 1), `Від кошика до правого краю ${Math.round(right)}px — має лишитися лише padding 24px.`).toBe(true);
  }, '.cart { margin-left: auto; }');
});

describe('menu', () => {
  it('the menu items stand in a row 24px apart', () => {
    const items = $$('.menu li');
    expect(items.every((li) => near(box(li).top, box(items[0]).top, 1)), 'Пункти меню мають стояти в рядок: display: flex на .menu.').toBe(true);
    const gaps = items.slice(1).map((li, i) => Math.round(box(li).left - box(items[i]).right));
    expect(gaps).toEqual([24, 24]);
  }, '.menu { display: flex; gap: 24px; }');

  it('the list has no bullets, margin or padding', () => {
    const menu = must($('.menu'), 'Немає .menu.');
    expect([css(menu, 'list-style-type'), css(menu, 'margin-top'), css(menu, 'padding-left')]).toEqual(['none', '0px', '0px']);
  }, 'list-style: none; margin: 0; padding: 0;');
});
