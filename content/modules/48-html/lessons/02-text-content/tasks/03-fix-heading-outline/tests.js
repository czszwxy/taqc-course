const EXPECTED = [
  { level: 1, text: 'Повернення товару' },
  { level: 2, text: 'Хто може повернути' },
  { level: 2, text: 'Як повернути' },
  { level: 3, text: 'Через сайт' },
  { level: 3, text: 'У шоурумі' },
  { level: 2, text: 'Коли повернуть гроші' },
];

describe('outline', () => {
  it('the headings form the outline from the task', () => {
    expect(headings()).toEqual(EXPECTED);
  }, 'Зміст сторінки складається лише з h1–h6. Перетвори жирні абзаци й div на заголовки потрібного рівня.');

  it('no heading level is skipped', () => {
    const levels = headings().map((h) => h.level);
    const jumps = levels.filter((level, i) => i > 0 && level > levels[i - 1] + 1);
    expect(jumps, 'Заголовки, що перестрибують рівень').toEqual([]);
  }, 'Після h1 іде h2, після h2 — h3. Вгору можна на будь-який рівень.');
});

describe('the promo line', () => {
  it('«Знижка 10% на наступне замовлення!» is not a heading', () => {
    expect(headings().some((h) => h.text.includes('Знижка')), 'Рекламний рядок досі в змісті сторінки.').toBe(false);
  }, 'Реклама — не розділ сторінки. Зроби її абзацом.');

  it('it is a paragraph with <strong>', () => {
    const strong = must($$('p strong').find((el) => text(el).includes('Знижка 10%')), 'Немає <p><strong>Знижка 10% на наступне замовлення!</strong></p>.');
    expect(text(strong)).toBe('Знижка 10% на наступне замовлення!');
  }, 'Залиш текст, але в <p><strong>…</strong></p>.');
});

describe('content', () => {
  it('the paragraphs of the article are still there', () => {
    const paragraphs = $$('p').map((p) => text(p));
    ['протягом 14 днів', 'має всі ярлики', 'Є два способи', 'особистому кабінеті', 'Хрещатику, 1', '3 робочих днів'].forEach((part) => {
      expect(paragraphs.some((p) => p.includes(part)), `Зник абзац з текстом «${part}».`).toBe(true);
    });
  }, 'Текст абзаців не змінюй — лише розмітку заголовків.');
});
