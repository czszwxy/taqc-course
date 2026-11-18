const VAGUE = ['детальніше', 'тут', 'читати далі', 'більше', 'click here', 'more'];

describe('images', () => {
  it('the main photo has a meaningful alt and its size', () => {
    const img = must($('img[src="powerbank.jpg"]'), 'Головне фото зникло.');
    const alt = (img.getAttribute('alt') || '').trim();
    expect(alt.length, 'alt головного фото порожній або закороткий.').toBeGreaterThanOrEqual(10);
    expect(/павербанк|power ?bank/i.test(alt), 'alt має сказати, що на фото павербанк.').toBe(true);
    expect(/^(фото|зображення|картинка|image)/i.test(alt), 'Не починай alt зі слів «фото» чи «зображення».').toBe(false);
    expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['640', '360']);
  }, 'Опиши, що на фото, і додай width="640" height="360".');

  it('the decorative stars have an empty alt', () => {
    const stars = must($('img[src="stars.svg"]'), 'Зірочки зникли — залиш їх, але з порожнім alt.');
    expect(stars.hasAttribute('alt'), 'У прикраси має бути атрибут alt — порожній.').toBe(true);
    expect(stars.getAttribute('alt')).toBe('');
  }, 'Декор: alt="" (без alt читач може прочитати ім\'я файлу).');
});

describe('links', () => {
  it('the article title links to /blog/powerbank', () => {
    const link = must($('article h2 a[href="/blog/powerbank"]'), 'Заголовок статті має бути посиланням на /blog/powerbank.');
    expect(accessibleName(link)).toBe('Як вибрати павербанк');
  }, 'Загорни текст заголовка в <a href="/blog/powerbank">.');

  it('no link says «Читати далі»', () => {
    const vague = $$('a').map((a) => accessibleName(a)).filter((name) => VAGUE.includes(name.toLowerCase()));
    expect(vague, 'Посилання без зрозумілої мети').toEqual([]);
  }, 'Прибери «Читати далі»: заголовок уже веде до статті.');

  it('«Коментарі (8)» jumps to #comments', () => {
    const link = must($$('a').find((a) => accessibleName(a).startsWith('Коментарі')), 'Немає посилання «Коментарі (8)».');
    expect(link.getAttribute('href')).toBe('#comments');
    const target = must(document.getElementById('comments'), 'Немає елемента з id="comments".');
    expect(text(target).includes('Максим'), 'id="comments" — у розділу з коментарями.').toBe(true);
  }, 'href="#comments" і id="comments" у розділу коментарів.');

  it('the author email opens a letter', () => {
    const link = must($('a[href^="mailto:"]'), 'Email має бути посиланням з href="mailto:…".');
    expect(link.getAttribute('href')).toBe('mailto:olena@gadgetly.example');
  }, 'href="mailto:olena@gadgetly.example".');

  it('the source opens in a new tab with a warning', () => {
    const link = must($('a[href="https://lab.example/battery-test-2026"]'), 'Посилання на джерело зникло.');
    expect(link.getAttribute('target')).toBe('_blank');
    expect((link.getAttribute('rel') || '').split(/\s+/).includes('noopener'), 'Додай rel="noopener".').toBe(true);
    expect(/нов(ій|у|а) вкладц/i.test(accessibleName(link)), 'Текст посилання має попереджати про нову вкладку.').toBe(true);
  }, 'target="_blank" rel="noopener" і «(відкриється в новій вкладці)» в тексті.');
});
