const cards = () => $$('.product');
const near = (a, b, delta = 1) => Math.abs(a - b) <= delta;

describe('container', () => {
  it('the list is a wrapping flex row with a 16px gap and no bullets', () => {
    const list = must($('.products'), 'Немає .products.');
    expect([css(list, 'display'), css(list, 'flex-wrap'), css(list, 'row-gap'), css(list, 'column-gap'), css(list, 'list-style-type'), css(list, 'padding-left')]).toEqual(['flex', 'wrap', '16px', '16px', 'none', '0px']);
  }, '.products { display: flex; flex-wrap: wrap; gap: 16px; list-style: none; padding: 0; }');

  it('the list is at most 960px wide and centered', () => {
    const b = box($('.products'));
    expect(Math.round(b.width)).toBe(960);
    expect(near(b.left, document.documentElement.clientWidth - b.right), 'Список не по центру: margin: 0 auto.').toBe(true);
  }, 'max-width: 960px; margin: 0 auto;');
});

describe('cards', () => {
  it('cards grow from a 220px basis and have padding, border and radius', () => {
    const card = must(cards()[0], 'Картки зникли.');
    expect([css(card, 'flex-grow'), css(card, 'flex-basis'), css(card, 'box-sizing'), css(card, 'padding-top'), css(card, 'border-top-width'), color(card, 'border-top-color'), css(card, 'border-top-left-radius')]).toEqual(['1', '220px', 'border-box', '16px', '1px', rgb('#d1d5db'), '8px']);
  }, '.product { flex: 1 1 220px; padding: 16px; border: 1px solid #d1d5db; border-radius: 8px; } і box-sizing: border-box.');

  it('four cards in the first row, two in the second', () => {
    const tops = cards().map((card) => Math.round(box(card).top));
    expect(tops.slice(0, 4).every((top) => near(top, tops[0])), 'Перші чотири картки мають стояти в одному ряду.').toBe(true);
    expect(tops[4] > tops[0] && near(tops[4], tops[5]), 'П\'ята й шоста картки — у другому ряду.').toBe(true);
  }, 'flex-wrap: wrap і border-box: 4 × 220 + 3 × 16 = 928 ≤ 960.');

  it('the free space is shared: 228px in the first row, 472px in the second', () => {
    const widths = cards().map((card) => Math.round(box(card).width));
    expect(widths).toEqual([228, 228, 228, 228, 472, 472]);
  }, 'flex-grow: 1 ділить залишок місця між картками ряду.');

  it('cards in a row have the same height', () => {
    const heights = cards().slice(0, 4).map((card) => Math.round(box(card).height));
    expect(heights.every((h) => near(h, heights[0])), `Висоти в першому ряду: ${heights.join(', ')}.`).toBe(true);
  }, 'align-items: stretch (за замовчуванням) — не перевизначай його.');
});
