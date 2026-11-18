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
const clipped = () => [document.documentElement, ...$$('body, body *')]
  .filter((node) => ['hidden', 'clip'].includes(css(node, 'overflow-x')) && node.scrollWidth > node.clientWidth + 1)
  .map(label);
const contentBox = (node) => {
  const b = box(node);
  const left = b.left + parseFloat(css(node, 'padding-left'));
  return { left, width: b.width - parseFloat(css(node, 'padding-left')) - parseFloat(css(node, 'padding-right')) };
};
const atWidth = async (width, check) => {
  await setViewport(width);
  try {
    await check();
  } finally {
    await setViewport(375);
  }
};

describe('phone', () => {
  it('nothing sticks out at 375px and 320px', async () => {
    for (const width of [375, 320]) {
      await atWidth(width, () => {
        expect(sticksOut(), `На ${width}px за край екрана вилазять`).toEqual([]);
        expect(document.documentElement.scrollWidth <= viewportWidth(), `На ${width}px сторінка прокручується вбік.`).toBe(true);
      });
    }
  }, 'Шукай найглибший елемент, ширший за екран: кроки, підсумок, логотипи, кнопка, IBAN.');

  it('nothing is cut off with overflow: hidden', async () => {
    for (const width of [375, 320]) {
      await atWidth(width, () => {
        expect(clipped(), `На ${width}px обрізано вміст у`).toEqual([]);
      });
    }
  }, 'overflow: hidden ховає те, що вилазить. Виправ сам елемент.');

  it('the bank logos keep their proportions', async () => {
    await atWidth(320, () => {
      const img = el('.bank-logos img');
      expect(near(box(img).height, (box(img).width * 60) / 420), 'Логотипи сплющені: висота має йти за пропорціями 420 × 60.').toBe(true);
    });
  }, '.bank-logos img { max-width: 100%; height: auto; }');

  it('the pay button is as wide as the page content', async () => {
    await atWidth(375, () => {
      const page = contentBox(el('.page'));
      const button = box(el('.pay-button'));
      expect(near(button.left, page.left) && near(button.width, page.width), 'Кнопка «Сплатити» має займати всю ширину вмісту сторінки — не більше й не менше.').toBe(true);
    });
  }, 'width: 100% разом з margin-left — ширше за батька. Прибери margin-left.');
});

describe('wide screen (1024px)', () => {
  it('the steps stay in one row', async () => {
    await atWidth(1024, () => {
      const tops = new Set($$('.steps li').map((step) => Math.round(box(step).top)));
      expect(tops.size, 'На 1024px кроки оформлення мають стояти в один рядок.').toBe(1);
    });
  }, 'flex-wrap: wrap переносить лише тоді, коли місця бракує.');

  it('the summary keeps the label left and the sum right', async () => {
    await atWidth(1024, () => {
      const rows = $$('.summary dt').map((dt) => [box(dt), box(dt.nextElementSibling)]);
      expect(rows.every(([dt, dd]) => dd.left >= dt.right && near(dd.top, dt.top, 2)), 'На 1024px сума має стояти праворуч від назви, в тому самому рядку.').toBe(true);
    });
  }, '.summary { grid-template-columns: 1fr auto; }');
});
