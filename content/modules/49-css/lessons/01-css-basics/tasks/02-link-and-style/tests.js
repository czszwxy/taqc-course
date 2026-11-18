describe('stylesheet', () => {
  it('styles.css is linked from <head>', () => {
    expect(Boolean(document.head.querySelector('style[data-file="styles.css"]')), 'index.html не підключає styles.css: додай <link rel="stylesheet" href="styles.css"> у <head>.').toBe(true);
  }, '<link rel="stylesheet" href="styles.css"> — у <head>, ім\'я файлу точно styles.css.');
});

describe('rules', () => {
  it('body: system-ui font and text color #1f2937', () => {
    expect(css(document.body, 'font-family').includes('system-ui'), 'font-family має починатися з system-ui.').toBe(true);
    expect(color(document.body)).toBe(rgb('#1f2937'));
  }, 'body { font-family: system-ui, sans-serif; color: #1f2937; }');

  it('h1 is #1d4ed8', () => {
    expect(color(must($('h1'), 'Немає <h1>.'))).toBe(rgb('#1d4ed8'));
  }, 'h1 { color: #1d4ed8; }');

  it('.price is bold and #15803d', () => {
    const price = must($('.price'), 'Немає .price.');
    expect([css(price, 'font-weight'), color(price)]).toEqual(['700', rgb('#15803d')]);
  }, '.price { font-weight: 700; color: #15803d; } — клас з крапкою.');

  it('.note has a yellow background and 12px padding', () => {
    const note = must($('.note'), 'Немає .note.');
    expect([color(note, 'background-color'), css(note, 'padding-top'), css(note, 'padding-left')]).toEqual([rgb('#fef3c7'), '12px', '12px']);
  }, '.note { background-color: #fef3c7; padding: 12px; }');

  it('other paragraphs keep the body color', () => {
    const plain = must($$('p').find((p) => !p.className), 'Звичайний абзац зник.');
    expect(color(plain)).toBe(rgb('#1f2937'));
  }, 'Колір з body успадковують усі елементи, яким не задано свого кольору.');
});
