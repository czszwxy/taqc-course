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
const contentWidth = (node) => box(node).width - parseFloat(css(node, 'padding-left')) - parseFloat(css(node, 'padding-right'));
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
  }, 'Шукай найглибший елемент, ширший за екран: повідомлення, email, товари, поле коду, JSON.');

  it('nothing is cut off with overflow: hidden', async () => {
    for (const width of [375, 320]) {
      await atWidth(width, () => {
        expect(clipped(), `На ${width}px обрізано вміст у`).toEqual([]);
      });
    }
  }, 'overflow: hidden ховає те, що вилазить. Виправ сам елемент: ширину, перенесення, прокрутку всередині.');

  it('the JSON for support is readable in full', async () => {
    await atWidth(320, () => {
      const pre = el('.tracking');
      expect(scrollsX(pre) || pre.scrollWidth <= pre.clientWidth + 1, 'JSON вилазить за свій блок: дай йому прокрутку (overflow-x: auto) або перенось рядки.').toBe(true);
    });
  }, '.tracking { overflow-x: auto; } — або white-space: pre-wrap з overflow-wrap: anywhere.');

  it('the whole email is visible', async () => {
    await atWidth(320, () => {
      const email = $$('.order-meta dd')[2];
      expect(box(must(email, 'Немає email у .order-meta.')).right <= viewportWidth() + 1, 'Email вилазить за екран.').toBe(true);
    });
  }, '.order-meta dd { overflow-wrap: anywhere; }');
});

describe('wide screen (1024px)', () => {
  it('the three products stay in one row', async () => {
    await atWidth(1024, () => {
      const tops = new Set($$('.thumb').map((thumb) => Math.round(box(thumb).top)));
      expect(tops.size, 'На 1024px товари мають стояти в один рядок.').toBe(1);
    });
  }, 'flex-wrap: wrap переносить лише тоді, коли місця бракує.');

  it('the notice is as wide as the page content', async () => {
    await atWidth(1024, () => {
      const page = el('.page');
      expect(near(box(el('.notice')).width, contentWidth(page)), `Ширина .notice — ${Math.round(box(el('.notice')).width)}px, а сторінки — ${Math.round(contentWidth(page))}px.`).toBe(true);
    });
  }, 'Блок і так займає всю ширину батька — width: 100vw не потрібен.');
});
