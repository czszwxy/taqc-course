const near = (a, b, delta = 1) => Math.abs(a - b) <= delta;
const el = (selector) => must($(selector), `Немає ${selector}.`);
const viewportWidth = () => document.documentElement.clientWidth;
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
const contentWidth = (node) => box(node).width - parseFloat(css(node, 'padding-left')) - parseFloat(css(node, 'padding-right'));
const atWidth = async (width, check) => {
  await setViewport(width);
  try {
    await check();
  } finally {
    await setViewport(1024);
  }
};

describe('index.html', () => {
  it('has a viewport meta tag that allows zoom', () => {
    const meta = must($('meta[name="viewport"]'), 'Немає <meta name="viewport"> у <head>.');
    const content = (meta.getAttribute('content') || '').toLowerCase().replace(/\s+/g, '');
    const pairs = Object.fromEntries(content.split(/[,;]/).filter(Boolean).map((pair) => pair.split('=')));
    expect(pairs.width, 'Потрібно width=device-width.').toBe('device-width');
    expect(pairs['initial-scale'], 'Потрібно initial-scale=1.').toBe('1');
    expect(['no', '0'].includes(pairs['user-scalable']), 'user-scalable=no забороняє збільшувати сторінку.').toBe(false);
    expect(pairs['maximum-scale'] !== undefined && Number(pairs['maximum-scale']) < 2, 'maximum-scale обмежує збільшення — прибери його.').toBe(false);
  }, '<meta name="viewport" content="width=device-width, initial-scale=1"> — і нічого не обмежуй.');
});

describe('wide screen (1024px)', () => {
  it('the header and the content are 960px wide and centered', () => {
    ['.site-header', '.page'].forEach((selector) => {
      const b = box(el(selector));
      expect(Math.round(b.width), `Ширина ${selector} на 1024px`).toBe(960);
      expect(near(b.left, viewportWidth() - b.right), `${selector} не по центру.`).toBe(true);
    });
  }, 'max-width: 960px; margin: 0 auto; — замість width: 960px.');

  it('the table fills the content width', () => {
    expect(near(box(el('.rates')).width, contentWidth(el('.page'))), 'На широкому екрані таблиця — на всю ширину блоку.').toBe(true);
  }, '.rates { width: 100%; }');
});

describe('phone (375px and 320px)', () => {
  it('nothing sticks out of the screen', async () => {
    for (const width of [375, 320]) {
      await atWidth(width, () => {
        expect(sticksOut(), `На ${width}px за край екрана вилазять`).toEqual([]);
        expect(document.documentElement.scrollWidth <= viewportWidth(), `На ${width}px сторінка прокручується вбік.`).toBe(true);
      });
    }
  }, 'Шукай фіксовані ширини: шапка, .page, фото, таблиця, довге посилання.');

  it('the content takes the whole width of a phone', async () => {
    await atWidth(375, () => {
      const b = box(el('.page'));
      expect([Math.round(b.left), Math.round(b.width)]).toEqual([0, 375]);
    });
  }, 'max-width не заважає блоку бути вужчим: на телефоні він займає всю ширину.');

  it('the photo shrinks and keeps its proportions', async () => {
    await atWidth(320, () => {
      const img = el('.hero');
      expect(box(img).width <= contentWidth(el('.page')) + 0.5, 'Фото ширше за блок.').toBe(true);
      expect(near(box(img).height, (box(img).width * 400) / 900), 'Фото сплющене: висота має йти за пропорціями 900 × 400.').toBe(true);
    });
  }, '.hero { max-width: 100%; height: auto; }');

  it('the table scrolls inside .table-wrap, not the page', async () => {
    await atWidth(320, () => {
      const wrap = el('.table-wrap');
      expect(Math.round(box(el('.rates')).width), 'Таблиця не має стискатися вужче за 560px (min-width).').toBeGreaterThanOrEqual(560);
      expect(scrollsX(wrap), '.table-wrap має прокручуватися: overflow-x: auto.').toBe(true);
      expect(box(wrap).right <= viewportWidth() + 1, '.table-wrap ширша за екран.').toBe(true);
    });
  }, '.table-wrap { overflow-x: auto; } .rates { width: 100%; min-width: 560px; }');

  it('the overflow is fixed, not hidden', () => {
    const hidden = [document.documentElement, document.body].map((node) => css(node, 'overflow-x')).filter((value) => value === 'hidden' || value === 'clip');
    expect(hidden.length, 'overflow-x: hidden на html / body лише обрізає те, що вилазить.').toBe(0);
  }, 'Прибери overflow-x: hidden і виправ самі елементи.');
});
