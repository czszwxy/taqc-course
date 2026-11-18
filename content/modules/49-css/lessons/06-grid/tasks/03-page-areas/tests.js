const part = (cls) => box(must($(`.${cls}`), `Немає .${cls}.`));
const near = (a, b, delta = 1) => Math.abs(a - b) <= delta;

describe('grid', () => {
  it('.page is a grid with a 16px gap', () => {
    const page = must($('.page'), 'Немає .page.');
    expect([css(page, 'display'), css(page, 'column-gap'), css(page, 'row-gap')]).toEqual(['grid', '16px', '16px']);
  }, '.page { display: grid; gap: 16px; }');
});

describe('areas', () => {
  it('header and footer span the full width', () => {
    const page = part('page');
    expect(near(part('page-header').width, page.width) && near(part('page-footer').width, page.width), 'Шапка й футер мають бути на всю ширину (header header / footer footer).').toBe(true);
  }, 'Рядки "header header" і "footer footer".');

  it('the sidebar is on the left, 240px wide', () => {
    const page = part('page');
    const sidebar = part('page-sidebar');
    expect(near(sidebar.left, page.left), 'Навігація має бути ліворуч.').toBe(true);
    expect(Math.round(sidebar.width)).toBe(240);
  }, 'Перша колонка — 240px, область sidebar.');

  it('main is to the right of the sidebar, in the same row', () => {
    const page = part('page');
    const sidebar = part('page-sidebar');
    const main = part('page-main');
    expect(near(main.top, sidebar.top), 'main і навігація мають бути в одному рядку.').toBe(true);
    expect(near(main.left, sidebar.right + 16), 'main — праворуч від навігації через gap 16px.').toBe(true);
    expect(near(main.right, page.right), 'main займає решту ширини (1fr).').toBe(true);
  }, 'Рядок "sidebar main" і колонки 240px 1fr.');

  it('the rows follow each other with 16px gaps', () => {
    const header = part('page-header');
    const main = part('page-main');
    const footer = part('page-footer');
    const middleBottom = Math.max(main.bottom, part('page-sidebar').bottom);
    expect(near(main.top, header.bottom + 16), 'Між шапкою і вмістом — 16px.').toBe(true);
    expect(near(footer.top, middleBottom + 16), 'Футер — під вмістом і навігацією через 16px.').toBe(true);
  }, 'Три рядки сітки: шапка, середина, футер.');
});
