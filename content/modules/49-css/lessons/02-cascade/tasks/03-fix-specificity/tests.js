const [regular, sale] = $$('.product');

describe('prices', () => {
  it('the sale price is #b91c1c', () => {
    expect(color(must(sale, 'Товар зі знижкою зник.').querySelector('.price'))).toBe(rgb('#b91c1c'));
  }, '#catalog .price (1, 1, 0) перемагає .product--sale .price (0, 2, 0). Прибери id із селектора.');

  it('the regular price stays #1f2937', () => {
    expect(color(must(regular, 'Звичайний товар зник.').querySelector('.price'))).toBe(rgb('#1f2937'));
  }, 'Базове правило .price { color: #1f2937; } має лишитися.');
});

describe('titles', () => {
  it('the sale title is #b91c1c', () => {
    expect(color(sale.querySelector('.product-title'))).toBe(rgb('#b91c1c'));
  }, '!important у .product-title перемагає будь-яку специфічність. Прибери його.');

  it('the regular title stays #1d4ed8', () => {
    expect(color(regular.querySelector('.product-title'))).toBe(rgb('#1d4ed8'));
  }, '.product-title { color: #1d4ed8; } — без !important.');
});

describe('buttons', () => {
  it('the buttons use the page font', () => {
    const button = must($('.buy'), 'Кнопка зникла.');
    expect(css(button, 'font-family')).toBe(css(document.body, 'font-family'));
    expect(css(button, 'font-size'), 'Розмір шрифту кнопки має бути як у сторінки (font: inherit).').toBe(css(document.body, 'font-size'));
  }, 'Кнопки не успадковують шрифт: .buy { font: inherit; }');

  it('the button padding is still 8px 16px', () => {
    const button = $('.buy');
    expect([css(button, 'padding-top'), css(button, 'padding-left')]).toEqual(['8px', '16px']);
  }, 'Не загуби відступи кнопки.');
});
