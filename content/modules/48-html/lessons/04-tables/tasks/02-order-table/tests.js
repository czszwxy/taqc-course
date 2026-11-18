const PRODUCTS = ['Навушники Gadgetly Pods 2', 'Чохол для телефона', 'Кабель USB-C, 1 м'];

describe('caption', () => {
  it('the table is named «Замовлення № 1042» by its <caption>', () => {
    const table = must($('table'), 'Таблиця зникла.');
    const caption = must(table.caption, 'У таблиці немає <caption>.');
    expect(text(caption)).toBe('Замовлення № 1042');
  }, '<caption> — перший елемент усередині <table>.');

  it('the old paragraph above the table is gone', () => {
    expect($$('p').some((p) => text(p).includes('1042')), 'Абзац «Замовлення № 1042» над таблицею досі є.').toBe(false);
  }, 'Назва тепер у <caption>, абзац прибери.');
});

describe('column headers', () => {
  it('<thead> has four <th scope="col">: Товар, Ціна, Кількість, Сума', () => {
    const thead = must($('table thead'), 'Немає <thead>.');
    const cells = Array.from(thead.querySelectorAll('th'));
    expect(cells.map((th) => text(th))).toEqual(['Товар', 'Ціна', 'Кількість', 'Сума']);
    expect(cells.map((th) => th.getAttribute('scope')), 'Кожен заголовок стовпця — scope="col".').toEqual(['col', 'col', 'col', 'col']);
    expect(thead.querySelectorAll('td').length, 'У <thead> не має бути <td>.').toBe(0);
  }, 'Рядок заголовків: <thead><tr><th scope="col">Товар</th>…</tr></thead>.');
});

describe('body rows', () => {
  it('<tbody> has the three products, each named by <th scope="row">', () => {
    const rows = Array.from(must($('table tbody'), 'Немає <tbody>.').rows);
    expect(rows.length, 'У <tbody> мають бути рівно три рядки товарів.').toBe(3);
    expect(rows.map((tr) => text(tr.cells[0]))).toEqual(PRODUCTS);
    expect(rows.every((tr) => tr.cells[0].localName === 'th' && tr.cells[0].getAttribute('scope') === 'row'), 'Назва товару — <th scope="row">.').toBe(true);
    expect(rows.every((tr) => tr.cells.length === 4 && Array.from(tr.cells).slice(1).every((cell) => cell.localName === 'td')), 'Ціна, кількість і сума — три <td>.').toBe(true);
  }, 'Рядок товару: <th scope="row">назва</th><td>ціна</td><td>кількість</td><td>сума</td>.');

  it('a screen reader gets the right headers for a cell', () => {
    const cell = $$('tbody td').find((td) => text(td) === '798 грн');
    expect(role(must(cell && cell.parentElement.cells[0], 'Немає рядка чохла.'))).toBe('rowheader');
    expect(role(must($('thead th:last-child'), 'Немає заголовка «Сума».'))).toBe('columnheader');
  }, 'Тоді читач скаже: «Чохол для телефона, Сума, 798 грн».');
});

describe('total', () => {
  it('<tfoot> has «Разом» across three columns and the total', () => {
    const tfoot = must($('table tfoot'), 'Підсумок має бути в <tfoot>.');
    const row = must(tfoot.rows[0], 'У <tfoot> немає рядка.');
    expect(row.cells.length, 'Рядок підсумку: дві клітинки — «Разом» і сума.').toBe(2);
    const label = row.cells[0];
    expect([label.localName, text(label), label.getAttribute('scope'), label.colSpan]).toEqual(['th', 'Разом', 'row', 3]);
    expect(text(row.cells[1])).toBe('4 044 грн');
  }, '<tfoot><tr><th scope="row" colspan="3">Разом</th><td>4 044 грн</td></tr></tfoot>.');
});
