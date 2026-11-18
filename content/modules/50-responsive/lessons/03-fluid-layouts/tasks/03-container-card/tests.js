const near = (a, b, delta = 1) => Math.abs(a - b) <= delta;
const el = (selector) => must($(selector), `Немає ${selector}.`);
const rem = () => parseFloat(css(document.documentElement, 'font-size'));
const parts = (card) => [box(must(card.querySelector('img'), 'У картці немає фото.')), box(must(card.querySelector('.product-info'), 'У картці немає .product-info.'))];
const horizontal = (card) => {
  const [img, info] = parts(card);
  return img.right <= info.left + 0.5 && near(img.top, info.top, 2);
};
const stacked = (card) => {
  const [img, info] = parts(card);
  return img.bottom <= info.top + 0.5;
};
const mainCard = () => el('main .product-card');
const asideCards = () => $$('aside .product-card');
const atWidth = async (width, check) => {
  await setViewport(width);
  try {
    await check();
  } finally {
    await setViewport(1024);
  }
};

describe('containers', () => {
  it('every .card-slot is an inline-size container', () => {
    expect($$('.card-slot').map((slot) => css(slot, 'container-type'))).toEqual(['inline-size', 'inline-size', 'inline-size']);
  }, '.card-slot { container-type: inline-size; }');
});

describe('one screen, two looks (1024px)', () => {
  it('the card in the main content is horizontal, the photo 10rem wide', () => {
    expect(horizontal(mainCard()), 'В основному вмісті (672px) фото має стояти ліворуч від тексту, обидва — по верху.').toBe(true);
    expect(Math.round(box(mainCard().querySelector('img')).width), 'Ширина фото в горизонтальній картці').toBe(Math.round(10 * rem()));
  }, '@container (min-width: 28rem) { .product-card { grid-template-columns: 10rem 1fr; align-items: start; } }');

  it('the cards in the narrow sidebar stay vertical', () => {
    expect(asideCards().map(stacked), 'У бічній колонці (18rem) фото має лишатися над текстом').toEqual([true, true]);
  }, 'Container query дивиться на ширину контейнера, а не екрана: у бічній колонці лише 18rem.');

  it('the same on a wide screen (1440px)', async () => {
    await atWidth(1440, () => {
      expect(horizontal(mainCard()), 'На 1440px картка в основному вмісті — горизонтальна.').toBe(true);
      expect(asideCards().map(stacked), 'На 1440px картки в бічній колонці — вертикальні').toEqual([true, true]);
    });
  }, 'Ширший екран не робить бічну колонку ширшою — вона завжди 18rem.');
});

describe('other widths', () => {
  it('768px: the sidebar is below and wide, so its cards are horizontal too', async () => {
    await atWidth(768, () => {
      expect(horizontal(mainCard()), 'На 768px картка в основному вмісті — горизонтальна.').toBe(true);
      expect(asideCards().map(horizontal), 'На 768px бічна колонка широка — її картки теж горизонтальні').toEqual([true, true]);
    });
  }, 'До 64em бічна колонка стоїть під вмістом на всю ширину — контейнер широкий.');

  it('375px: every card is vertical', async () => {
    await atWidth(375, () => {
      expect([mainCard(), ...asideCards()].map(stacked), 'На 375px усі картки — фото над текстом').toEqual([true, true, true]);
      expect(document.documentElement.scrollWidth <= document.documentElement.clientWidth, 'На 375px сторінка прокручується вбік.').toBe(true);
    });
  }, 'Контейнер вужчий за 28rem — картка лишається вертикальною.');
});
