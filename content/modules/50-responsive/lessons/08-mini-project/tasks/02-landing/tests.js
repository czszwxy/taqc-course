const near = (a, b, delta = 1) => Math.abs(a - b) <= delta;
const el = (selector) => must($(selector), `Немає ${selector}.`);
const px = (node, property) => parseFloat(css(node, property));
const viewportWidth = () => document.documentElement.clientWidth;
// 1em у медіазапиті й rem без перевизначення html — шрифт браузера за замовчуванням (font-size: medium).
const browserFont = () => {
  const probe = document.createElement('div');
  probe.style.fontSize = 'medium';
  document.body.append(probe);
  const size = parseFloat(css(probe, 'font-size'));
  probe.remove();
  return size;
};
const middle = (node) => box(node).top + box(node).height / 2;
const columns = (selector) => new Set($$(selector).map((node) => Math.round(box(node).left))).size;
const rows = (selector) => new Set($$(selector).map((node) => Math.round(box(node).top))).size;
const scrollsX = (node) => ['auto', 'scroll'].includes(css(node, 'overflow-x'));
const insideScroller = (node) => {
  for (let parent = node.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    if (scrollsX(parent)) return true;
  }
  return false;
};
const label = (node) => [node.tagName.toLowerCase(), ...Array.from(node.classList)].join('.');
const sticksOut = () => $$('body *')
  .filter((node) => !insideScroller(node))
  .filter((node) => box(node).width > 0 && (box(node).right > viewportWidth() + 1 || box(node).left < -1))
  .map(label);
const atWidth = async (width, check) => {
  await setViewport(width);
  try {
    await check();
  } finally {
    await setViewport(1024);
  }
};

describe('the page', () => {
  it('nothing sticks out at 320, 375, 768, 1024 and 1440px', async () => {
    for (const width of [320, 375, 768, 1024, 1440]) {
      await atWidth(width, () => {
        expect(sticksOut(), `На ${width}px за край екрана вилазять`).toEqual([]);
        expect(document.documentElement.scrollWidth <= viewportWidth(), `На ${width}px сторінка прокручується вбік.`).toBe(true);
      });
    }
  }, 'Check називає елемент і ширину — почни з найглибшого.');

  it('.wrap: full width minus 2rem, at most 72rem, centered', async () => {
    const R = browserFont();
    for (const [width, expected] of [[375, 375 - 2 * R], [1024, 1024 - 2 * R], [1440, 72 * R]]) {
      await atWidth(width, () => {
        const wraps = $$('.wrap').map(box);
        expect(wraps.every((b) => near(b.width, expected) && near(b.left, viewportWidth() - b.right)), `На ${width}px кожен .wrap має бути ${expected}px завширшки і по центру.`).toBe(true);
      });
    }
  }, '.wrap { width: min(100% - 2rem, 72rem); margin-inline: auto; }');
});

describe('header', () => {
  it('the logo and the menu share a row on a wide screen', () => {
    const logo = el('.logo');
    const menu = el('.menu');
    expect(box(logo).right < box(menu).left && near(middle(logo), middle(menu), 2), 'На 1024px логотип ліворуч, меню праворуч, по центру по вертикалі.').toBe(true);
    expect(rows('.menu li'), 'Пункти меню на 1024px — в один рядок.').toBe(1);
    expect(css(menu, 'list-style-type')).toBe('none');
  }, '.header-inner { display: flex; align-items: center; justify-content: space-between; } .menu { display: flex; }');

  it('menu links are at least 44px tall, on a phone too', async () => {
    await atWidth(320, () => {
      const short = $$('.menu a').filter((link) => box(link).height < 43.5).map((link) => link.textContent);
      expect(short, 'На 320px пункти меню нижчі за 44px').toEqual([]);
    });
  }, '.menu a { display: inline-flex; align-items: center; min-height: 2.75rem; }');

  it('the menu still fits a phone when the user doubles the font size', async () => {
    document.documentElement.style.setProperty('font-size', `${2 * browserFont()}px`);
    try {
      await atWidth(375, () => {
        const out = $$('.menu li').filter((item) => box(item).right > viewportWidth() + 1).map((item) => text(item));
        expect(out, 'На 375px зі збільшеним удвічі шрифтом за край вилазять пункти меню').toEqual([]);
      });
    } finally {
      document.documentElement.style.removeProperty('font-size');
    }
  }, '.menu { flex-wrap: wrap; } — пункти переносяться на новий рядок, коли їм тісно.');
});

describe('hero', () => {
  it('phone: the text above the photo, the photo full width', async () => {
    await atWidth(375, () => {
      const text = box(el('.hero-text'));
      const photo = box(el('.hero-photo'));
      expect(photo.top >= text.bottom - 0.5, 'На телефоні фото — під текстом.').toBe(true);
      expect(near(photo.width, box(el('.hero-inner')).width), 'На телефоні фото — на всю ширину.').toBe(true);
    });
  }, 'Базово .hero-inner — сітка з однією колонкою.');

  it('just below 48em: still one under another', async () => {
    await atWidth(48 * browserFont() - 1, () => {
      expect(box(el('.hero-photo')).top >= box(el('.hero-text')).bottom - 0.5, 'До 48em фото — під текстом.').toBe(true);
    });
  }, 'Дві колонки — лише від 48em.');

  it('from 48em: the text and the photo side by side', async () => {
    for (const width of [48 * browserFont(), 1024]) {
      await atWidth(width, () => {
        const text = box(el('.hero-text'));
        const photo = box(el('.hero-photo'));
        expect(photo.left >= text.right - 0.5 && photo.top < text.bottom, `На ${width}px фото має стояти праворуч від тексту.`).toBe(true);
      });
    }
  }, '@media (min-width: 48em) { .hero-inner { grid-template-columns: 1fr 1fr; align-items: center; } }');

  it('the heading: 2rem on a phone, 3.5rem at most, fluid between', async () => {
    const R = browserFont();
    await atWidth(320, () => expect(px(el('.hero h1'), 'font-size'), 'Заголовок на 320px').toBe(2 * R));
    await atWidth(1440, () => expect(px(el('.hero h1'), 'font-size'), 'Заголовок на 1440px').toBe(3.5 * R));
    expect(Math.abs(px(el('.hero h1'), 'font-size') - (1.5 * R + 25.6)) <= 0.5, 'Заголовок на 1024px — 1.5rem + 2.5vw.').toBe(true);
  }, '.hero h1 { font-size: clamp(2rem, 1.5rem + 2.5vw, 3.5rem); }');

  it('the heading grows when the user doubles the font size', () => {
    const before = px(el('.hero h1'), 'font-size');
    document.documentElement.style.setProperty('font-size', `${2 * browserFont()}px`);
    try {
      const ratio = px(el('.hero h1'), 'font-size') / before;
      expect(ratio >= 1.3, `Зі збільшеним удвічі шрифтом заголовок виріс лише в ${ratio.toFixed(2)} раза.`).toBe(true);
    } finally {
      document.documentElement.style.removeProperty('font-size');
    }
  }, 'Межі й частина бажаного значення clamp() — у rem.');
});

describe('products', () => {
  it('1 column on a phone, 2 from 40em, 4 from 64em', async () => {
    const E = browserFont();
    for (const [width, count] of [[375, 1], [40 * E - 1, 1], [40 * E, 2], [64 * E - 1, 2], [64 * E, 4], [1440, 4]]) {
      await atWidth(width, () => {
        expect(columns('.product'), `Колонок товарів на ${width}px`).toBe(count);
      });
    }
  }, 'Базово — одна колонка; @media (min-width: 40em) — дві; @media (min-width: 64em) — чотири.');

  it('product photos are square and fill the card', async () => {
    for (const width of [375, 1024]) {
      await atWidth(width, () => {
        const wrong = $$('.product img').filter((img) => {
          const card = img.closest('.product');
          const inner = box(card).width - px(card, 'padding-left') - px(card, 'padding-right') - px(card, 'border-left-width') - px(card, 'border-right-width');
          return !near(box(img).width, inner) || !near(box(img).height, box(img).width) || css(img, 'object-fit') !== 'cover';
        }).length;
        expect(wrong, `На ${width}px фото товарів не квадратні на всю ширину картки (з object-fit: cover)`).toBe(0);
      });
    }
  }, '.product img { width: 100%; aspect-ratio: 1; object-fit: cover; }');
});

describe('perks and footer', () => {
  it('perks: 1 column on a phone, 3 on 1024px, without media queries', async () => {
    await atWidth(375, () => expect(columns('.perk'), 'Колонок переваг на 375px').toBe(1));
    expect(columns('.perk'), 'Колонок переваг на 1024px').toBe(3);
    expect(cssRules().filter((rule) => rule.media && rule.selector.includes('.perk-list')).length, 'Переваги мають підлаштовуватися без медіазапитів.').toBe(0);
  }, '.perk-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); gap: 1rem; }');

  it('footer: stacked on a phone, one row on 1024px', async () => {
    await atWidth(375, () => expect(rows('.footer-col'), 'На 375px колонки футера — одна під одною').toBe(3));
    expect(rows('.footer-col'), 'На 1024px колонки футера — в один рядок').toBe(1);
  }, '.footer-inner { display: flex; flex-wrap: wrap; gap: 2rem; } .footer-col { flex: 1 1 12rem; }');
});

describe('touch', () => {
  it('hover effects only for devices that can hover', () => {
    const loose = cssRules().filter((rule) => rule.selector.includes(':hover') && !/\(\s*(any-)?hover\s*:\s*hover\s*\)/.test(rule.media || '')).map((rule) => rule.selector);
    expect(loose, 'Правила :hover поза @media (hover: hover)').toEqual([]);
  }, '@media (hover: hover) { .menu a:hover { … } .button:hover { … } }');
});
