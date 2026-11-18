const el = (selector) => must($(selector), `Немає ${selector}.`);
const size = (node) => `${Math.round(box(node).width)}×${Math.round(box(node).height)}`;
const HOVER_MEDIA = /\(\s*(any-)?hover\s*:\s*hover\s*\)/;

describe('touch targets', () => {
  it('the −, + and remove buttons are at least 44 × 44px', () => {
    const small = $$('.qty-btn, .remove').filter((button) => box(button).width < 43.5 || box(button).height < 43.5).map((button) => `${button.getAttribute('aria-label')}: ${size(button)}`);
    expect(small, 'Кнопки, менші за 44 × 44px').toEqual([]);
  }, '.qty-btn, .remove { min-width: 2.75rem; min-height: 2.75rem; }');

  it('the quantity field is as tall as the buttons', () => {
    expect($$('.qty').filter((input) => box(input).height < 43.5).map(size), 'Поля кількості нижчі за 44px').toEqual([]);
  }, '.qty { min-height: 2.75rem; } — замість height: 28px.');

  it('at least 8px between −, the field and +', () => {
    const tight = $$('.qty-control').filter((control) => {
      const [minus, plus] = Array.from(control.querySelectorAll('.qty-btn')).map(box);
      const field = box(control.querySelector('.qty'));
      return field.left - minus.right < 7.5 || plus.left - field.right < 7.5;
    });
    expect(tight.length, 'Між «−», полем і «+» менше 8px — пальцем легко влучити не туди.').toBe(0);
  }, '.qty-control { gap: 0.5rem; }');

  it('nothing sticks out at 320px', async () => {
    await setViewport(320);
    try {
      expect(document.documentElement.scrollWidth <= document.documentElement.clientWidth, 'На 320px кошик прокручується вбік.').toBe(true);
    } finally {
      await setViewport(375);
    }
  }, 'Рядок товару переноситься (flex-wrap) — збільшені кнопки мають уміщатися і на 320px.');
});

describe('fields', () => {
  it('fields use at least 16px text, so iPhone does not zoom in', () => {
    const small = ['.qty', '.promo-input'].filter((selector) => $$(selector).some((input) => parseFloat(css(input, 'font-size')) < 16));
    expect(small, 'Поля зі шрифтом менше 16px').toEqual([]);
  }, '.qty, .promo-input { font-size: 1rem; }');
});

describe('no hover-only design', () => {
  it('hover effects only for devices that can hover', () => {
    const loose = cssRules().filter((rule) => rule.selector.includes(':hover') && !HOVER_MEDIA.test(rule.media || '')).map((rule) => rule.selector);
    expect(loose, 'Правила :hover поза @media (hover: hover)').toEqual([]);
  }, '@media (hover: hover) { .qty-btn:hover, .remove:hover { … } .checkout:hover { … } }');

  it('the free delivery condition is visible without hovering', () => {
    const note = el('.delivery-note');
    expect(!isHidden(note) && box(note).height > 0, 'Умову безкоштовної доставки видно лише при наведенні — на телефоні її не побачать.').toBe(true);
  }, 'Прибери display: none у .delivery-note і правило .delivery:hover .delivery-note.');
});

describe('the checkout bar', () => {
  it('the bar keeps at least 0.75rem at the bottom', () => {
    expect(parseFloat(css(el('.checkout-bar'), 'padding-bottom')) >= 0.75 * parseFloat(css(document.documentElement, 'font-size')) - 0.5, 'Поле знизу панелі менше за 0.75rem.').toBe(true);
  }, '.checkout-bar { padding-bottom: max(0.75rem, env(safe-area-inset-bottom)); }');

  it('the bar does not cover the end of the cart', async () => {
    await setViewport(375, 600);
    try {
      window.scrollTo(0, document.documentElement.scrollHeight);
      const last = box(el('.delivery'));
      const bar = box(el('.checkout-bar'));
      expect(last.bottom <= bar.top + 0.5, `Коли доскролити до кінця, панель «Оформити» закриває умови доставки (${Math.round(last.bottom - bar.top)}px).`).toBe(true);
    } finally {
      window.scrollTo(0, 0);
      await setViewport(375);
    }
  }, '.cart { padding-bottom: 6rem; } — місце під фіксовану панель.');
});
