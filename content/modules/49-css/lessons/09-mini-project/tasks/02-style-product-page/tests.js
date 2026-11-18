const near = (a, b, delta = 1) => Math.abs(a - b) <= delta;
const px = (value) => parseFloat(value);
const el = (selector) => must($(selector), `Немає ${selector}.`);
const middle = (node) => box(node).top + box(node).height / 2;

describe('base', () => {
  it('border-box everywhere, body without margin, readable text', () => {
    expect([css(el('.product'), 'box-sizing'), css(el('.button'), 'box-sizing'), css(document.body, 'margin-left')]).toEqual(['border-box', 'border-box', '0px']);
    expect(css(document.body, 'font-family').includes('system-ui'), 'Шрифт: system-ui.').toBe(true);
    expect(css(document.body, 'font-size')).toBe('16px');
    const ratio = px(css(el('.stock'), 'line-height')) / px(css(el('.stock'), 'font-size'));
    expect(ratio >= 1.45 && ratio <= 1.75, `Інтерліньяж ${ratio.toFixed(2)} — потрібно 1.5–1.7.`).toBe(true);
  }, 'Скидання і основа — уроки 3 і 4.');

  it('the button is painted through --color-brand', () => {
    const root = document.documentElement;
    root.style.setProperty('--color-brand', '#7c3aed');
    try {
      expect(color(el('.button'), 'background-color'), 'Фон кнопки має йти з var(--color-brand).').toBe(rgb('#7c3aed'));
    } finally {
      root.style.removeProperty('--color-brand');
    }
  }, ':root { --color-brand: …; } .button { background-color: var(--color-brand); }');
});

describe('header and skip link', () => {
  it('logo and menu stand in one row, the menu items too', () => {
    const logo = el('.logo');
    const menu = el('.menu');
    expect(near(middle(logo), middle(menu), 2) && box(logo).right < box(menu).left, 'Логотип і меню — в одному рядку, по центру по вертикалі.').toBe(true);
    const items = $$('.menu li');
    expect(items.every((li) => near(box(li).top, box(items[0]).top)), 'Пункти меню — в рядок.').toBe(true);
    expect(css(menu, 'list-style-type')).toBe('none');
  }, 'Flexbox — урок 5.');

  it('the skip link hides off-screen and appears on focus', async () => {
    const skip = el('.skip-link');
    const visible = () => box(skip).bottom > 0 && box(skip).top < window.innerHeight && box(skip).width > 1;
    expect(isHidden(skip), 'Не ховай skip link через display: none.').toBe(false);
    expect(visible(), 'Skip link видно до фокусу.').toBe(false);
    const release = simulateFocus(skip);
    try {
      expect(visible(), 'Skip link не з\'являється при фокусі.').toBe(true);
    } finally {
      release();
    }
  }, 'Урок 7: за екраном + :focus.');
});

describe('layout', () => {
  it('.layout is at most 1100px and centered', () => {
    const b = box(el('.layout'));
    expect(b.width <= 1101, 'Розкладка ширша за 1100px.').toBe(true);
    expect(near(b.left, document.documentElement.clientWidth - b.right), '.layout не по центру.').toBe(true);
  }, 'max-width: 1100px; margin: 0 auto;');

  it('the article is on the left, .related (280px) on the right, breadcrumbs above both', () => {
    const product = box(el('.product'));
    const related = box(el('.related'));
    const crumbs = box(el('.breadcrumbs'));
    expect(Math.round(related.width)).toBe(280);
    expect(related.left > product.right && near(related.top, product.top, 2), 'Стаття і .related мають стояти поруч, в одному рядку.').toBe(true);
    expect(near(crumbs.left, product.left) && near(crumbs.right, related.right) && crumbs.bottom <= product.top, 'Хлібні крихти — над обома колонками.').toBe(true);
  }, 'grid-template-columns: 1fr 280px; .breadcrumbs { grid-column: 1 / -1; }');

  it('no horizontal scroll at 1024px and at 800px', async () => {
    const fits = () => document.documentElement.scrollWidth <= document.documentElement.clientWidth;
    expect(fits(), `На 1024px сторінка ширша за вікно: ${document.documentElement.scrollWidth}px.`).toBe(true);
    await setViewport(800);
    try {
      expect(fits(), `На 800px сторінка ширша за вікно: ${document.documentElement.scrollWidth}px.`).toBe(true);
    } finally {
      await setViewport(1024);
    }
  }, 'Найчастіше винне фото без max-width: 100%.');
});

describe('components', () => {
  it('the photo fits its column and keeps its proportions, even at 800px', async () => {
    const img = el('.product-photo img');
    await setViewport(800);
    try {
      const column = box(el('.product'));
      expect(box(img).width <= column.width + 0.5, 'На 800px фото ширше за колонку статті.').toBe(true);
      expect(near(box(img).height, box(img).width, 1), 'Фото 1:1 має лишитися квадратним (height: auto).').toBe(true);
    } finally {
      await setViewport(1024);
    }
  }, '.product-photo img { display: block; max-width: 100%; height: auto; } — атрибут width="600" лише задає пропорції.');

  it('the price is at least 1.5× the base text', () => {
    expect(px(css(el('.price strong'), 'font-size')) >= 1.5 * px(css(document.body, 'font-size'))).toBe(true);
  }, '.price strong { font-size: 1.75rem; }');

  it('the button: white on brand, padding, radius, page font, focus-visible outline', () => {
    const button = el('.button');
    expect(color(button)).toBe(rgb('#fff'));
    expect(contrast(button) >= 4.5, `Контраст кнопки ${contrast(button)} : 1.`).toBe(true);
    expect(px(css(button, 'padding-top')) >= 8 && px(css(button, 'border-top-left-radius')) > 0, 'Кнопці потрібні padding від 8px і заокруглення.').toBe(true);
    expect(css(button, 'font-family'), 'font: inherit — шрифт сторінки.').toBe(css(document.body, 'font-family'));
    const focus = cssRules().find((r) => r.selector.includes(':focus-visible') && !r.selector.includes(':not(:focus-visible)') && r.selector.includes('.button'));
    expect(Boolean(focus) && px(focus.style.getPropertyValue('outline-width')) >= 2 && focus.style.getPropertyValue('outline-style') !== 'none', 'Немає .button:focus-visible з outline від 2px.').toBe(true);
  }, 'Урок 8: .button:focus-visible { outline: 3px solid …; }');

  it('the specs table: collapsed borders, padded cells with a bottom line', () => {
    const table = el('.specs');
    const cell = el('.specs td');
    expect(css(table, 'border-collapse')).toBe('collapse');
    expect(px(css(cell, 'padding-top')) >= 6 && px(css(cell, 'padding-left')) >= 6, 'Клітинкам потрібен padding від 6px.').toBe(true);
    expect(px(css(cell, 'border-bottom-width')) >= 1, 'Клітинкам потрібна нижня рамка.').toBe(true);
  }, '.specs { border-collapse: collapse; } .specs th, .specs td { padding: 8px; border-bottom: 1px solid …; }');

  it('reviews are cards with a border or background and padding', () => {
    $$('.review').forEach((review) => {
      const framed = px(css(review, 'border-top-width')) >= 1 || color(review, 'background-color') !== rgb('transparent');
      expect(framed && px(css(review, 'padding-top')) >= 8, 'Відгук має бути карткою: рамка чи фон і padding від 8px.').toBe(true);
    });
  }, '.review { border: 1px solid …; padding: 16px; }');
});

describe('contrast', () => {
  it('all text has at least 4.5:1 contrast', () => {
    const checks = ['.stock', '.price del', '.product-photo figcaption', '.menu a', '.breadcrumbs a', '.related a', '.site-footer p', '.review p', '.specs th'];
    const low = checks.map((selector) => [selector, contrast(el(selector))]).filter(([, ratio]) => ratio < 4.5).map(([selector, ratio]) => `${selector}: ${ratio}`);
    expect(low, 'Текст з контрастом менше 4.5 : 1').toEqual([]);
  }, 'Особливо стара ціна й підпис фото — сірі тексти часто заблідні.');
});
