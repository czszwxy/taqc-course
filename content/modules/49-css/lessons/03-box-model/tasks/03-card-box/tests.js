const card = () => must($('.card'), 'Картка зникла.');
const near = (a, b) => Math.abs(a - b) <= 1;

describe('box-sizing', () => {
  it('everything uses border-box', () => {
    expect([css(card(), 'box-sizing'), css(must($('h2'), 'Немає h2.'), 'box-sizing'), css(document.body, 'box-sizing')]).toEqual(['border-box', 'border-box', 'border-box']);
    expect(window.getComputedStyle(card(), '::before').getPropertyValue('box-sizing'), 'Псевдоелементам теж: *::before, *::after.').toBe('border-box');
  }, '*, *::before, *::after { box-sizing: border-box; }');
});

describe('card', () => {
  it('the card is 320px from border to border', () => {
    expect(Math.round(box(card()).width)).toBe(320);
  }, 'З border-box width: 320px — це ширина з padding і border.');

  it('padding 16px, 1px #d1d5db border, 12px radius', () => {
    const el = card();
    expect([css(el, 'padding-top'), css(el, 'padding-left'), css(el, 'border-top-width'), css(el, 'border-top-style'), color(el, 'border-top-color'), css(el, 'border-top-left-radius')]).toEqual(['16px', '16px', '1px', 'solid', rgb('#d1d5db'), '12px']);
  }, '.card { padding: 16px; border: 1px solid #d1d5db; border-radius: 12px; }');

  it('the card is centered with 24px above it', () => {
    const b = box(card());
    const right = document.documentElement.clientWidth - b.right;
    expect(near(b.left, right), `Зліва ${Math.round(b.left)}px, справа ${Math.round(right)}px — картка не по центру.`).toBe(true);
    expect(css(card(), 'margin-top')).toBe('24px');
  }, 'margin: 24px auto; — auto зліва й справа ділить вільне місце порівну.');
});

describe('image and button', () => {
  it('the image is a block as wide as the card content (286px)', () => {
    const img = must($('.card img'), 'Картинка зникла.');
    expect(css(img, 'display')).toBe('block');
    expect(Math.round(box(img).width)).toBe(286);
    expect(Math.round(box(img).height), 'Висота має зберегти пропорції 4:3 (height: auto).').toBe(215);
  }, '.card img { display: block; width: 100%; height: auto; } → 320 − 32 − 2 = 286.');

  it('the button link is an inline-block with padding, colors and radius', () => {
    const button = must($('.button'), 'Посилання .button зникло.');
    expect([css(button, 'display'), css(button, 'padding-top'), css(button, 'padding-left'), color(button, 'background-color'), color(button), css(button, 'border-top-left-radius'), css(button, 'text-decoration-line')]).toEqual(['inline-block', '8px', '16px', rgb('#1d4ed8'), rgb('#fff'), '8px', 'none']);
  }, '.button { display: inline-block; padding: 8px 16px; background-color: #1d4ed8; color: #fff; border-radius: 8px; text-decoration: none; }');

  it('the 12px margin above the button really pushes it down', () => {
    const button = $('.button');
    const price = must($('.price'), 'Ціна зникла.');
    const gap = box(button).top - box(price).bottom;
    const priceMargin = parseFloat(css(price, 'margin-bottom'));
    expect(css(button, 'margin-top')).toBe('12px');
    expect(gap >= priceMargin + 11, `Між ціною і кнопкою ${Math.round(gap)}px — вертикальний margin не діє (потрібне inline-block).`).toBe(true);
  }, 'Рядковий елемент ігнорує вертикальний margin; inline-block — ні.');
});
