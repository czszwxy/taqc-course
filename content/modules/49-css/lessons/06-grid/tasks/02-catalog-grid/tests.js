const cards = () => $$('.card');
const columnsNow = () => new Set(cards().map((card) => Math.round(box(card).left))).size;
const near = (a, b, delta = 1) => Math.abs(a - b) <= delta;

describe('grid', () => {
  it('the list is a grid with a 16px gap and no bullets', () => {
    const grid = must($('.grid'), 'Немає .grid.');
    expect([css(grid, 'display'), css(grid, 'row-gap'), css(grid, 'column-gap'), css(grid, 'list-style-type'), css(grid, 'padding-left')]).toEqual(['grid', '16px', '16px', 'none', '0px']);
  }, '.grid { display: grid; gap: 16px; list-style: none; padding: 0; margin: 0; }');

  it('main is 960px wide and centered', () => {
    const b = box(must($('main'), 'Немає main.'));
    expect(Math.round(b.width)).toBe(960);
    expect(near(b.left, document.documentElement.clientWidth - b.right), 'main не по центру.').toBe(true);
  }, 'main { max-width: 960px; margin: 0 auto; }');

  it('at 1024px there are four 228px columns', () => {
    expect(columnsNow(), 'Кількість колонок на 1024px').toBe(4);
    expect(cards().slice(1).map((card) => Math.round(box(card).width)).every((w) => w === 228), 'Звичайна картка має бути 228px: (960 − 3 × 16) / 4.').toBe(true);
  }, 'repeat(auto-fill, minmax(200px, 1fr)) у 960px дає 4 колонки.');

  it('the featured card spans two columns (472px)', () => {
    const featured = must($('.card--featured'), 'Немає .card--featured.');
    expect(Math.round(box(featured).width)).toBe(472);
  }, '.card--featured { grid-column: span 2; } — 2 × 228 + 16.');

  it('cards share a row height and padding, border, radius', () => {
    const second = cards()[1];
    const third = cards()[2];
    expect(near(box(second).height, box(third).height)).toBe(true);
    expect([css(second, 'padding-top'), css(second, 'border-top-width'), color(second, 'border-top-color'), css(second, 'border-top-left-radius'), css(second, 'box-sizing')]).toEqual(['16px', '1px', rgb('#d1d5db'), '8px', 'border-box']);
  }, '.card { padding: 16px; border: 1px solid #d1d5db; border-radius: 8px; } і border-box.');

  it('at 500px the same CSS gives two columns', async () => {
    await setViewport(500);
    try {
      expect(columnsNow(), 'Кількість колонок на 500px').toBe(2);
      expect(Math.round(box($('.card--featured')).width), 'На 500px картка тижня — на всю ширину (дві колонки).').toBe(484);
    } finally {
      await setViewport(1024);
    }
  }, 'auto-fill сама зменшує кількість колонок, коли місця менше.');
});
