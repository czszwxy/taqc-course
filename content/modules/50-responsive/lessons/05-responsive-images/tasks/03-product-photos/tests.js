const near = (a, b, delta = 1) => Math.abs(a - b) <= delta;
const el = (selector) => must($(selector), `Немає ${selector}.`);
const attr = (node, name) => (node.getAttribute(name) || '').trim();
// "a.jpg 800w, b.jpg 1600w" → ['a.jpg 800w', 'b.jpg 1600w'] — без дескриптора це 1x; порядок не важливий.
const candidates = (node) => attr(node, 'srcset').split(',').map((part) => part.trim().split(/\s+/)).filter(([url]) => url).map(([url, descriptor = '1x']) => `${url} ${descriptor}`).sort();
const SLOT = /^\((min-width:\s*64em|width\s*>=\s*64em)\)\s+50vw\s*,\s*100vw$/;
const WIDE = /^\((min-width:\s*48em|width\s*>=\s*48em)\)$/;
const photo = () => el('.product-photo');
const picture = () => must(photo().closest('picture'), 'Головне фото має бути всередині <picture>.');
const sources = () => Array.from(picture().querySelectorAll('source'));
const sourceOf = (type) => must(sources().find((source) => attr(source, 'type') === type), `Немає <source type="${type}">.`);

describe('logo', () => {
  it('the logo has a 2x file for sharp screens', () => {
    const logo = el('.logo');
    expect(candidates(logo)).toEqual(['logo.png 1x', 'logo@2x.png 2x']);
    expect([attr(logo, 'src'), attr(logo, 'width'), attr(logo, 'height')]).toEqual(['logo.png', '120', '32']);
  }, 'srcset="logo.png 1x, logo@2x.png 2x" — src, width і height не змінюй.');
});

describe('main photo', () => {
  it('<picture>: AVIF, then WebP, then <img> last', () => {
    expect(sources().map((source) => attr(source, 'type')), 'Типи <source> по черзі').toEqual(['image/avif', 'image/webp']);
    const children = Array.from(picture().children).map((child) => child.tagName.toLowerCase());
    expect(children[children.length - 1], '<img> має стояти в <picture> останнім.').toBe('img');
  }, 'Браузер бере перший <source>, який підтримує: AVIF легший, тому він перший.');

  it('every format lists its 800w and 1600w files', () => {
    expect(candidates(sourceOf('image/avif')), 'srcset у AVIF').toEqual(['pods-1600.avif 1600w', 'pods-800.avif 800w']);
    expect(candidates(sourceOf('image/webp')), 'srcset у WebP').toEqual(['pods-1600.webp 1600w', 'pods-800.webp 800w']);
    expect(candidates(photo()), 'srcset у <img>').toEqual(['pods-1600.jpg 1600w', 'pods-800.jpg 800w']);
    expect(attr(photo(), 'src')).toBe('pods-800.jpg');
  }, 'srcset="pods-800.avif 800w, pods-1600.avif 1600w" — і так само для webp і jpg.');

  it('every <source> and the <img> have sizes', () => {
    const wrong = [...sources(), photo()].filter((node) => !SLOT.test(attr(node, 'sizes').replace(/\s+/g, ' '))).map((node) => attr(node, 'type') || 'img');
    expect(wrong, 'Немає правильного sizes="(min-width: 64em) 50vw, 100vw" у').toEqual([]);
  }, 'sizes не успадковується з <img>: без нього <source> вважає, що фото на всю ширину вікна.');

  it('the main photo loads first and keeps its alt and size', () => {
    const img = photo();
    expect(attr(img, 'loading') === 'lazy', 'Головне фото на першому екрані не має бути lazy.').toBe(false);
    expect(attr(img, 'fetchpriority')).toBe('high');
    expect([attr(img, 'width'), attr(img, 'height')]).toEqual(['1600', '1200']);
    expect(attr(img, 'alt').includes('Pods 2'), 'alt головного фото не змінюй.').toBe(true);
  }, 'fetchpriority="high", width="1600" height="1200", без loading="lazy".');

  it('on a phone the photo fits and keeps 4 : 3', async () => {
    await setViewport(375);
    try {
      const b = box(photo());
      expect(b.width <= box(el('.page')).width + 0.5, 'Фото ширше за сторінку.').toBe(true);
      expect(near(b.height, (b.width * 3) / 4), 'Фото втратило пропорції 4 : 3.').toBe(true);
    } finally {
      await setViewport(1024);
    }
  }, 'width і height на <img> дають браузеру пропорції ще до завантаження.');
});

describe('promo banner', () => {
  it('a wide crop from 48em, a square crop on phones', () => {
    const banner = must($('.promo picture'), 'Банер має бути в <picture>.');
    const wide = must(banner.querySelector('source'), 'У банері немає <source>.');
    expect(WIDE.test(attr(wide, 'media')), 'У <source> банера потрібно media="(min-width: 48em)".').toBe(true);
    expect([candidates(wide), attr(wide, 'width'), attr(wide, 'height')]).toEqual([['sale-wide.jpg 1x'], '1600', '500']);
    const img = must(banner.querySelector('img'), 'У банері немає <img>.');
    expect([attr(img, 'src'), attr(img, 'width'), attr(img, 'height')]).toEqual(['sale-square.jpg', '800', '800']);
    expect(attr(img, 'alt')).toBe('Знижка 20 % на всі навушники до неділі');
  }, '<source media="(min-width: 48em)" srcset="sale-wide.jpg" width="1600" height="500"> + <img src="sale-square.jpg" width="800" height="800" alt="…">');
});

describe('related products', () => {
  it('the thumbnails load lazily and reserve their space', () => {
    const thumbs = $$('.related img');
    expect(thumbs.length).toBe(3);
    const wrong = thumbs.filter((img) => attr(img, 'loading') !== 'lazy' || attr(img, 'width') !== '400' || attr(img, 'height') !== '400').map((img) => attr(img, 'src'));
    expect(wrong, 'Без loading="lazy" або width="400" height="400"').toEqual([]);
    expect(thumbs.every((img) => img.getAttribute('alt') === ''), 'Порожній alt лиши: назву товару вже каже текст посилання.').toBe(true);
  }, 'Кожному фото схожих товарів — width="400" height="400" loading="lazy".');
});
