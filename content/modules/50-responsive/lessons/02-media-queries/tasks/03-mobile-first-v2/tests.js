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
const columns = () => new Set($$('.topic').map((topic) => Math.round(box(topic).left))).size;
const middle = (node) => box(node).top + box(node).height / 2;
const heroInRow = () => {
  const title = box(el('.help-hero h1'));
  const search = box(el('.help-search'));
  return title.right <= search.left && near(middle(el('.help-hero h1')), middle(el('.help-search')), 2);
};
const searchBelow = () => box(el('.help-search')).top >= box(el('.help-hero h1')).bottom - 1;
const atWidth = async (width, check) => {
  await setViewport(width);
  try {
    await check();
  } finally {
    await setViewport(1024);
  }
};

describe('phone', () => {
  it('375px: the search under the title, one column', async () => {
    await atWidth(375, () => {
      expect(searchBelow(), 'На телефоні пошук — під заголовком.').toBe(true);
      expect(columns(), 'Колонок на 375px').toBe(1);
      expect(document.documentElement.scrollWidth <= document.documentElement.clientWidth, 'На 375px сторінка прокручується вбік.').toBe(true);
    });
  }, 'Базові правила — для телефона: без display: flex у .help-hero і без колонок у .topics.');

  it('just below 40em: still one column', async () => {
    await atWidth(40 * mediaEm() - 1, () => {
      expect(searchBelow(), 'До 40em пошук — під заголовком.').toBe(true);
      expect(columns()).toBe(1);
    });
  }, 'Рядок і дві колонки — лише від 40em.');
});

describe('wider screens', () => {
  it('at 40em: the title and the search in one row, two columns', async () => {
    await atWidth(40 * mediaEm(), () => {
      expect(heroInRow(), 'Від 40em заголовок і пошук — в одному рядку, по центру по вертикалі.').toBe(true);
      expect(columns(), `Колонок на ${40 * mediaEm()}px`).toBe(2);
    });
  }, '@media (min-width: 40em) { .help-hero { display: flex; align-items: center; … } .topics { grid-template-columns: repeat(2, 1fr); } }');

  it('just below 64em: two columns', async () => {
    await atWidth(64 * mediaEm() - 1, () => {
      expect(columns()).toBe(2);
    });
  }, 'Чотири колонки — лише від 64em.');

  it('at 64em: four columns, the hero still in one row', async () => {
    await atWidth(64 * mediaEm(), () => {
      expect(columns(), `Колонок на ${64 * mediaEm()}px`).toBe(4);
      expect(heroInRow(), 'Заголовок і пошук — в одному рядку.').toBe(true);
      const gap = box(el('.help-search')).left - box(el('.help-hero h1')).right;
      expect(gap >= 2 * rem() - 1, `Між заголовком і пошуком ${Math.round(gap)}px — потрібно щонайменше 2rem.`).toBe(true);
    });
  }, '@media (min-width: 64em) { .topics { grid-template-columns: repeat(4, 1fr); } }');
});
