const near = (a, b, delta = 1) => Math.abs(a - b) <= delta;
const el = (selector) => must($(selector), `Немає ${selector}.`);
const rem = () => parseFloat(css(document.documentElement, 'font-size'));
const viewportWidth = () => document.documentElement.clientWidth;
const cards = () => $$('.card');
const columns = () => new Set(cards().map((card) => Math.round(box(card).left))).size;
// Скільки колонок по min(100%, 20rem) з gap 1rem влазить у ширину сітки — і якої вони ширини.
const expectedGrid = (width) => {
  const gap = rem();
  const smallest = Math.min(width, 20 * rem());
  const count = Math.max(1, Math.floor((width + gap) / (smallest + gap)));
  return { count, width: (width - (count - 1) * gap) / count };
};
const atWidth = async (width, check) => {
  await setViewport(width);
  try {
    await check();
  } finally {
    await setViewport(1024);
  }
};

describe('.wrap', () => {
  it('full width minus 2rem, centered', async () => {
    for (const width of [320, 1024]) {
      await atWidth(width, () => {
        const b = box(el('.wrap'));
        expect(Math.round(b.width), `Ширина .wrap на ${width}px`).toBe(Math.round(width - 2 * rem()));
        expect(near(b.left, viewportWidth() - b.right), `.wrap не по центру на ${width}px.`).toBe(true);
      });
    }
  }, '.wrap { width: min(100% - 2rem, 70rem); margin-inline: auto; }');

  it('at most 70rem on a wide screen', async () => {
    await atWidth(1440, () => {
      const b = box(el('.wrap'));
      expect(Math.round(b.width), 'Ширина .wrap на 1440px').toBe(Math.round(70 * rem()));
      expect(near(b.left, viewportWidth() - b.right), '.wrap не по центру на 1440px.').toBe(true);
    });
  }, 'Друге значення в min() — максимальна ширина: 70rem.');
});

describe('grid', () => {
  it('the cards are 1rem apart', () => {
    expect([css(el('.cards'), 'display'), css(el('.cards'), 'column-gap'), css(el('.cards'), 'row-gap')]).toEqual(['grid', `${rem()}px`, `${rem()}px`]);
  }, '.cards { display: grid; gap: 1rem; }');

  it('the grid picks the number of columns itself', async () => {
    for (const width of [375, 768, 1024, 1440]) {
      await atWidth(width, () => {
        const expected = expectedGrid(box(el('.cards')).width);
        expect(columns(), `Колонок на ${width}px`).toBe(expected.count);
        expect(near(box(cards()[0]).width, expected.width), `Ширина картки на ${width}px: ${Math.round(box(cards()[0]).width)}px замість ${Math.round(expected.width)}px.`).toBe(true);
      });
    }
  }, 'repeat(auto-fit, minmax(min(100%, 20rem), 1fr)): на 375 — одна колонка, на 768 — дві, на 1024 і 1440 — три.');

  it('nothing sticks out at 320px', async () => {
    await atWidth(320, () => {
      const wide = cards().filter((card) => box(card).right > viewportWidth() + 1).length;
      expect(wide, 'На 320px картки ширші за екран — колонці 20rem тут замало місця.').toBe(0);
      expect(document.documentElement.scrollWidth <= viewportWidth(), 'На 320px сторінка прокручується вбік.').toBe(true);
    });
  }, 'min(100%, 20rem): у контейнері, вужчому за 20rem, колонка стискається до його ширини.');
});

describe('photos', () => {
  it('every photo fills the card in a 4 : 3 frame', async () => {
    for (const width of [375, 1024]) {
      await atWidth(width, () => {
        const wrong = $$('.card img').filter((img) => {
          const card = img.closest('.card');
          const inner = box(card).width - parseFloat(css(card, 'padding-left')) - parseFloat(css(card, 'padding-right')) - parseFloat(css(card, 'border-left-width')) - parseFloat(css(card, 'border-right-width'));
          return !near(box(img).width, inner) || !near(box(img).height, (box(img).width * 3) / 4);
        });
        expect(wrong.map((img) => img.alt), `На ${width}px фото не в рамці 4 : 3 на всю ширину картки`).toEqual([]);
      });
    }
  }, '.card img { width: 100%; height: auto; aspect-ratio: 4 / 3; }');

  it('the photos are cropped, not stretched', () => {
    expect($$('.card img').every((img) => css(img, 'object-fit') === 'cover'), 'Без object-fit: cover фото різних пропорцій спотворюються в рамці 4 : 3.').toBe(true);
  }, '.card img { object-fit: cover; }');
});
