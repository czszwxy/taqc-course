const near = (a, b, delta = 1) => Math.abs(a - b) <= delta;
const el = (selector) => must($(selector), `Немає ${selector}.`);
// 1em у медіазапиті — шрифт браузера за замовчуванням (font-size: medium), а не шрифт сторінки.
const mediaEm = () => {
  const probe = document.createElement('div');
  probe.style.fontSize = 'medium';
  document.body.append(probe);
  const size = parseFloat(css(probe, 'font-size'));
  probe.remove();
  return size;
};
const rem = () => parseFloat(css(document.documentElement, 'font-size'));
const columns = () => new Set($$('.store').map((store) => Math.round(box(store).left))).size;
const filtersAbove = () => box(el('.filters')).bottom <= box(el('.stores')).top + 1;
const atWidth = async (width, check) => {
  await setViewport(width);
  try {
    await check();
  } finally {
    await setViewport(1024);
  }
};

describe('phone', () => {
  it('375px: one column, the filters above the stores', async () => {
    await atWidth(375, () => {
      expect(columns(), 'Колонок магазинів на 375px').toBe(1);
      expect(filtersAbove(), 'На телефоні фільтри мають бути над списком.').toBe(true);
    });
  }, 'Базові правила (без медіазапитів) — для телефона: їх змінювати не треба.');

  it('320px: nothing sticks out', async () => {
    await atWidth(320, () => {
      expect(document.documentElement.scrollWidth <= document.documentElement.clientWidth, 'На 320px сторінка прокручується вбік.').toBe(true);
    });
  }, 'Колонки й фіксовані ширини мають з\'являтися лише в медіазапитах.');
});

describe('breakpoint 40em', () => {
  it('just below 40em: still one column', async () => {
    await atWidth(40 * mediaEm() - 1, () => {
      expect(columns(), `Колонок на ${40 * mediaEm() - 1}px`).toBe(1);
    });
  }, 'Дві колонки — лише від 40em (min-width: 40em).');

  it('at 40em: two columns, the filters still above', async () => {
    await atWidth(40 * mediaEm(), () => {
      expect(columns(), `Колонок на ${40 * mediaEm()}px`).toBe(2);
      expect(filtersAbove(), 'Фільтри переходять ліворуч лише від 64em.').toBe(true);
    });
  }, '@media (min-width: 40em) { .store-list { grid-template-columns: repeat(2, 1fr); } }');
});

describe('breakpoint 64em', () => {
  it('just below 64em: two columns, the filters above', async () => {
    await atWidth(64 * mediaEm() - 1, () => {
      expect(columns(), `Колонок на ${64 * mediaEm() - 1}px`).toBe(2);
      expect(filtersAbove(), 'До 64em фільтри — над списком.').toBe(true);
    });
  }, 'Бічна колонка фільтрів — лише від 64em.');

  it('at 64em: the filters on the left (15rem), three columns', async () => {
    await atWidth(64 * mediaEm(), () => {
      const filters = box(el('.filters'));
      const stores = box(el('.stores'));
      expect(Math.round(filters.width), 'Ширина фільтрів').toBe(Math.round(15 * rem()));
      expect(filters.right < stores.left && near(filters.top, stores.top, 2), 'Фільтри мають стояти ліворуч від списку, на одному рівні.').toBe(true);
      expect(columns(), 'Колонок на 1024px').toBe(3);
    });
  }, '@media (min-width: 64em) { .layout { grid-template-columns: 15rem 1fr; } .store-list { grid-template-columns: repeat(3, 1fr); } }');

  it('1440px: the page stays 72rem wide and centered, three columns', async () => {
    await atWidth(1440, () => {
      const page = box(el('.page'));
      expect(Math.round(page.width)).toBe(Math.round(72 * rem()));
      expect(near(page.left, document.documentElement.clientWidth - page.right), '.page не по центру.').toBe(true);
      expect(columns(), 'Колонок на 1440px').toBe(3);
    });
  }, 'Не змінюй .page: max-width: 72rem; margin: 0 auto;');
});
