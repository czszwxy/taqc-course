const el = (selector) => must($(selector), `Немає ${selector}.`);
const px = (node, property) => parseFloat(css(node, property));
const close = (actual, expected) => Math.abs(actual - expected) <= 0.5;
// Розмір шрифту з налаштувань браузера (font-size: medium) — від нього рахуються rem, коли html не перевизначено.
const browserFont = () => {
  const probe = document.createElement('div');
  probe.style.fontSize = 'medium';
  document.body.append(probe);
  const size = parseFloat(css(probe, 'font-size'));
  probe.remove();
  return size;
};
const atWidth = async (width, check) => {
  await setViewport(width);
  try {
    await check();
  } finally {
    await setViewport(1024);
  }
};
// Як людина, що збільшила шрифт у налаштуваннях браузера: удвічі більший базовий розмір.
const withDoubleFont = (check) => {
  document.documentElement.style.setProperty('font-size', `${2 * browserFont()}px`);
  try {
    check();
  } finally {
    document.documentElement.style.removeProperty('font-size');
  }
};

describe('base font size', () => {
  it('html keeps the font size from the browser settings', () => {
    const pxRoot = cssRules().filter((rule) => rule.selector.split(',').some((part) => ['html', ':root'].includes(part.trim())) && /px\s*$/.test(rule.style.getPropertyValue('font-size')));
    expect(pxRoot.length, 'html { font-size: …px } перекриває налаштування шрифту людини.').toBe(0);
    expect(px(document.documentElement, 'font-size'), 'Базовий розмір шрифту змінено — rem рахуватимуться від нього.').toBe(browserFont());
  }, 'Видали html { font-size: 16px; }.');
});

describe('fluid sizes', () => {
  it('the heading: 1.75rem on a phone, 3rem on a wide screen, fluid between', async () => {
    const R = browserFont();
    await atWidth(320, () => expect(px(el('.promo h1'), 'font-size'), 'Заголовок на 320px').toBe(1.75 * R));
    await atWidth(1600, () => expect(px(el('.promo h1'), 'font-size'), 'Заголовок на 1600px').toBe(3 * R));
    let at768 = 0;
    await atWidth(768, () => {
      at768 = px(el('.promo h1'), 'font-size');
    });
    const at1024 = px(el('.promo h1'), 'font-size');
    expect(close(at1024, 1.25 * R + 0.025 * 1024), `Заголовок на 1024px: ${at1024}px — очікується 1.25rem + 2.5vw = ${1.25 * R + 0.025 * 1024}px.`).toBe(true);
    expect(at768 < at1024, 'Між мінімумом і максимумом заголовок має плавно рости з шириною.').toBe(true);
  }, '.promo h1 { font-size: clamp(1.75rem, 1.25rem + 2.5vw, 3rem); }');

  it('the lead: 1.125rem on a phone, 1.375rem on a wide screen', async () => {
    const R = browserFont();
    await atWidth(320, () => expect(px(el('.lead'), 'font-size'), 'Підзаголовок на 320px').toBe(1.125 * R));
    await atWidth(1600, () => expect(px(el('.lead'), 'font-size'), 'Підзаголовок на 1600px').toBe(1.375 * R));
    expect(close(px(el('.lead'), 'font-size'), R + 0.005 * 1024), 'Підзаголовок на 1024px — 1rem + 0.5vw.').toBe(true);
  }, '.lead { font-size: clamp(1.125rem, 1rem + 0.5vw, 1.375rem); }');

  it('both grow when the user doubles the font size', () => {
    const before = [px(el('.promo h1'), 'font-size'), px(el('.lead'), 'font-size')];
    withDoubleFont(() => {
      const after = [px(el('.promo h1'), 'font-size'), px(el('.lead'), 'font-size')];
      const ratios = after.map((size, i) => size / before[i]);
      expect(ratios.every((ratio) => ratio >= 1.3), `Зі збільшеним удвічі шрифтом заголовок виріс у ${ratios[0].toFixed(2)} раза, підзаголовок — у ${ratios[1].toFixed(2)}. Чистий vw не росте — потрібна частина в rem.`).toBe(true);
    });
  }, 'Мінімум, максимум і частина бажаного значення — у rem.');
});

describe('the banner', () => {
  it('padding-block: 2rem on a phone, 4rem on a wide screen, 6vw between', async () => {
    const R = browserFont();
    await atWidth(320, () => expect(px(el('.promo'), 'padding-top'), 'Поле зверху на 320px').toBe(2 * R));
    await atWidth(1600, () => expect(px(el('.promo'), 'padding-bottom'), 'Поле знизу на 1600px').toBe(4 * R));
    expect(close(px(el('.promo'), 'padding-top'), 0.06 * 1024), 'Поле зверху на 1024px — 6vw.').toBe(true);
    expect(px(el('.promo'), 'padding-left'), 'Поле зліва').toBe(R);
  }, '.promo { padding-block: clamp(2rem, 6vw, 4rem); padding-inline: 1rem; }');

  it('the text stays inside the banner with WCAG text spacing on', async () => {
    const spacing = document.createElement('style');
    spacing.textContent = '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }';
    document.head.append(spacing);
    try {
      await atWidth(375, () => {
        const promo = el('.promo');
        const outside = Array.from(promo.children).filter((child) => box(child).bottom > box(promo).bottom + 0.5);
        expect(outside.map((child) => child.tagName.toLowerCase()), 'З інтервалами WCAG Text Spacing за межі банера вилазять').toEqual([]);
      });
    } finally {
      spacing.remove();
    }
  }, 'Прибери height: 220px — висоту банера задасть текст разом з полями.');
});
