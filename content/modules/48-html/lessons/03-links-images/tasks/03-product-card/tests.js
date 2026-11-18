const VAGUE = ['детальніше', 'тут', 'читати далі', 'більше', 'click here', 'more'];

describe('image', () => {
  it('the photo has a meaningful alt', () => {
    const img = must($('img'), 'Фото годинника зникло.');
    const alt = (img.getAttribute('alt') || '').trim();
    expect(alt.length, 'alt порожній або закороткий.').toBeGreaterThanOrEqual(10);
    expect(/годинник/i.test(alt), 'alt має сказати, що на фото годинник.').toBe(true);
    expect(/^(фото|зображення|картинка|image|picture)/i.test(alt), 'Не починай alt зі слів «фото» чи «зображення» — читач і так скаже «зображення».').toBe(false);
    expect(/\.(jpe?g|png|webp)$/i.test(alt), 'Ім\'я файлу — не alt.').toBe(false);
  }, 'Опиши, що покупець побачив би на фото: колір, ремінець, модель.');

  it('the photo has width="400" and height="400"', () => {
    const img = must($('img'), 'Фото годинника зникло.');
    expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['400', '400']);
  }, 'Додай справжні розміри файлу: width="400" height="400".');
});

describe('links', () => {
  it('the product name in <h2> links to /product/watch-3', () => {
    const link = must($('article h2 a[href="/product/watch-3"]'), 'У заголовку картки немає посилання на /product/watch-3.');
    expect(accessibleName(link)).toBe('Розумний годинник Gadgetly Watch 3');
  }, 'Загорни назву в посилання всередині <h2>.');

  it('no link says «Детальніше» or «тут»', () => {
    const vague = $$('a').map((a) => accessibleName(a)).filter((name) => VAGUE.includes(name.toLowerCase()));
    expect(vague, 'Посилання без зрозумілої мети').toEqual([]);
  }, 'Прибери «Детальніше»: назва товару вже веде на сторінку товару.');

  it('«Відгуки (24)» jumps to #reviews on this page', () => {
    const link = must($$('a').find((a) => accessibleName(a).startsWith('Відгуки')), 'Немає посилання «Відгуки (24)».');
    expect(link.getAttribute('href')).toBe('#reviews');
    const target = must(document.getElementById('reviews'), 'Немає елемента з id="reviews".');
    expect(text(target).includes('Тримає заряд'), 'id="reviews" має бути в розділу з відгуками.').toBe(true);
  }, 'Якір починається з #: href="#reviews", а розділ відгуків отримує id="reviews".');

  it('the warranty link warns about the new tab and has rel="noopener"', () => {
    const link = must($('a[target="_blank"]'), 'Посилання на умови гарантії має відкриватися в новій вкладці (target="_blank").');
    expect(link.getAttribute('href')).toBe('https://warranty.gadgetly.example/watch-3');
    expect((link.getAttribute('rel') || '').split(/\s+/).includes('noopener'), 'Додай rel="noopener".').toBe(true);
    expect(/нов(ій|у|а) вкладц/i.test(accessibleName(link)), 'Текст посилання має попереджати про нову вкладку.').toBe(true);
  }, 'Текст: «Умови гарантії (відкриється в новій вкладці)», атрибути target="_blank" rel="noopener".');

  it('the support number is a tel: link', () => {
    const link = must($('a[href^="tel:"]'), 'Номер підтримки має бути посиланням з href="tel:…".');
    expect(link.getAttribute('href')).toBe('tel:+380441234567');
    expect(text(link)).toBe('+38 044 123 45 67');
  }, 'У href — номер з кодом країни без пробілів (tel:+380441234567), а текст — як зручно читати.');
});
