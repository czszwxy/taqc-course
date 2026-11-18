const near = (a, b, delta = 1) => Math.abs(a - b) <= delta;
const header = () => must($('.site-header'), 'Шапка зникла.');

async function scrolledTo(y, check) {
  window.scrollTo(0, y);
  await setViewport(1024);
  try {
    check();
  } finally {
    window.scrollTo(0, 0);
  }
}

describe('badges', () => {
  it('each badge sits 8px from the top-right inner corner of its card', () => {
    $$('.card').forEach((card) => {
      const badge = must(card.querySelector('.badge'), 'Значок зник.');
      const c = box(card);
      const b = box(badge);
      const border = parseFloat(css(card, 'border-top-width'));
      expect(near(b.top, c.top + border + 8) && near(b.right, c.right - border - 8), `Значок «${text(badge)}» не в правому верхньому куті своєї картки.`).toBe(true);
    });
  }, '.card { position: relative; } .badge { position: absolute; top: 8px; right: 8px; }');

  it('badges do not push the titles down', () => {
    const card = $('.card');
    const title = must(card.querySelector('h2'), 'Заголовок картки зник.');
    expect(css(card.querySelector('.badge'), 'position')).toBe('absolute');
    expect(box(title).top - box(card).top < 50, 'Заголовок стоїть під значком — значок досі в потоці.').toBe(true);
  }, 'absolute виймає значок з потоку.');
});

describe('sticky header', () => {
  it('the header is sticky at the top with a white background and z-index 10', () => {
    expect([css(header(), 'position'), css(header(), 'top'), css(header(), 'z-index'), color(header(), 'background-color')]).toEqual(['sticky', '0px', '10', rgb('#fff')]);
  }, '.site-header { position: sticky; top: 0; z-index: 10; background-color: #fff; }');

  it('after scrolling down the header is still at the top', async () => {
    await scrolledTo(700, () => {
      expect(near(box(header()).top, 0), `Після прокрутки шапка на ${Math.round(box(header()).top)}px — не прилипла.`).toBe(true);
    });
  }, 'position: sticky + top: 0.');

  it('after scrolling down the header covers the cards', async () => {
    await scrolledTo(700, () => {
      const b = box(header());
      const hit = document.elementFromPoint(b.left + 200, b.top + b.height / 2);
      expect(Boolean(hit && hit.closest('.site-header')), 'Картки пропливають поверх шапки: потрібен z-index.').toBe(true);
    });
  }, 'Картки з position: relative пізніше в HTML — без z-index вони вище за шапку.');
});
