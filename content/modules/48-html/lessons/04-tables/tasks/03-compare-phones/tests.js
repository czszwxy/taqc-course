const FEATURES = ['Екран', "Пам'ять", 'Батарея', 'Ціна', 'Гарантія'];

describe('table', () => {
  it('the comparison is a <table> with the right <caption>', () => {
    const table = must($('table'), 'На сторінці немає <table>.');
    expect(text(must(table.caption, 'У таблиці немає <caption>.'))).toBe('Порівняння смартфонів Gadgetly X1 і X1 Pro');
  }, 'Назву таблиці пиши в <caption> першим елементом у <table>.');

  it('no div grid is left', () => {
    expect($$('.cell').length, 'На сторінці досі є <div class="cell">.').toBe(0);
  }, 'Видали стару сітку з <div> — таблиця її замінює.');
});

describe('headers', () => {
  it('the first row has three column headers', () => {
    const row = must($('table').rows[0], 'У таблиці немає рядків.');
    const cells = Array.from(row.cells);
    expect(cells.map((c) => text(c))).toEqual(['Характеристика', 'Gadgetly X1', 'Gadgetly X1 Pro']);
    expect(cells.map((c) => `${c.localName}/${c.getAttribute('scope')}`)).toEqual(['th/col', 'th/col', 'th/col']);
  }, 'Перший рядок: три <th scope="col">.');

  it('each feature row starts with <th scope="row">', () => {
    const rows = Array.from($('table').rows).slice(1);
    expect(rows.map((tr) => text(tr.cells[0]))).toEqual(FEATURES);
    expect(rows.every((tr) => tr.cells[0].localName === 'th' && tr.cells[0].getAttribute('scope') === 'row'), 'Назва характеристики — <th scope="row">.').toBe(true);
    expect(rows.every((tr) => role(tr.cells[0]) === 'rowheader')).toBe(true);
  }, 'Рядок: <th scope="row">Екран</th><td>…</td><td>…</td>.');
});

describe('values', () => {
  it('the values are in <td> under the right phone', () => {
    const rows = Array.from($('table').rows).slice(1, 5);
    expect(rows.map((tr) => Array.from(tr.cells).slice(1).map((c) => text(c)))).toEqual([
      ['6,1″ OLED', '6,7″ OLED'],
      ['128 ГБ', '256 ГБ'],
      ['4 000 мА·год', '5 000 мА·год'],
      ['18 999 грн', '25 999 грн'],
    ]);
    expect(rows.every((tr) => Array.from(tr.cells).slice(1).every((c) => c.localName === 'td'))).toBe(true);
  }, 'Порядок значень: спершу X1, потім X1 Pro.');

  it('the warranty is one cell across both phones', () => {
    const row = must(Array.from($('table').rows).find((tr) => text(tr.cells[0]) === 'Гарантія'), 'Немає рядка «Гарантія».');
    expect(row.cells.length, 'У рядку гарантії — назва і одна клітинка значення.').toBe(2);
    expect([text(row.cells[1]), row.cells[1].colSpan]).toEqual(['24 місяці', 2]);
  }, '<td colspan="2">24 місяці</td>.');
});
