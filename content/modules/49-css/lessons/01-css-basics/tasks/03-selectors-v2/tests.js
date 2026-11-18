describe('article', () => {
  it('only the first paragraph after each h2 is italic', () => {
    const styles = $$('article p').map((p) => css(p, 'font-style'));
    expect(styles).toEqual(['italic', 'normal', 'italic', 'normal']);
  }, 'h2 + p — лише абзац одразу після h2; h2 ~ p обрав би всі.');

  it('only links that open a new tab get " ↗"', () => {
    const blank = must($('a[target="_blank"]'), 'Посилання з target="_blank" зникло.');
    expect(window.getComputedStyle(blank, '::after').getPropertyValue('content').includes('↗')).toBe(true);
    expect(window.getComputedStyle(must($('footer a'), 'Посилання у футері зникло.'), '::after').getPropertyValue('content')).toBe('none');
  }, 'a[target="_blank"]::after { content: " ↗"; }');
});

describe('comments and form', () => {
  it('even comments have the #f3f4f6 background', () => {
    expect($$('.comments li').map((li) => color(li, 'background-color'))).toEqual([rgb('transparent'), rgb('#f3f4f6'), rgb('transparent'), rgb('#f3f4f6')]);
  }, '.comments li:nth-child(even) — 2-й і 4-й.');

  it('required fields have a 2px #b91c1c border, the optional one does not', () => {
    const name = must($('#name'), 'Поле імені зникло.');
    const comment = must($('#comment'), 'Поле коментаря зникло.');
    const site = must($('#site'), 'Поле сайту зникло.');
    [name, comment].forEach((field) => {
      expect([css(field, 'border-top-width'), css(field, 'border-top-style'), color(field, 'border-top-color')]).toEqual(['2px', 'solid', rgb('#b91c1c')]);
    });
    expect(color(site, 'border-top-color') === rgb('#b91c1c'), 'Необов\'язкове поле «Сайт» не має червоної рамки.').toBe(false);
  }, ':required (або [required]) { border: 2px solid #b91c1c; }');
});

describe('footer', () => {
  it('footer paragraphs are 14px', () => {
    expect(css(must($('footer p'), 'Абзац футера зник.'), 'font-size')).toBe('14px');
    expect(css(must($('article p'), 'Абзац статті зник.'), 'font-size') === '14px', 'Абзаци статті не мають зменшитися.').toBe(false);
  }, 'footer p { font-size: 14px; }');
});
