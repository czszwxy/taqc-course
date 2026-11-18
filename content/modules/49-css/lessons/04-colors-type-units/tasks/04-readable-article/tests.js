const paragraphs = () => $$('article p');
const px = (value) => parseFloat(value);

describe('size and spacing', () => {
  it('body text is at least 16px and h1 is twice the base size', () => {
    const p = must(paragraphs()[1], 'Абзаци зникли.');
    expect(px(css(p, 'font-size')) >= 16, `Текст ${css(p, 'font-size')} — замало. Основний текст: 1rem.`).toBe(true);
    expect(css(must($('h1'), 'Немає h1.'), 'font-size')).toBe(`${px(css(document.documentElement, 'font-size')) * 2}px`);
  }, 'body { font-size: 1rem; } h1 { font-size: 2rem; }');

  it('the line height is 1.5–1.7 of the font size', () => {
    const p = paragraphs()[1];
    const ratio = px(css(p, 'line-height')) / px(css(p, 'font-size'));
    expect(ratio >= 1.45 && ratio <= 1.75, `Інтерліньяж ${ratio.toFixed(2)} — потрібно 1.5–1.7.`).toBe(true);
  }, 'line-height: 1.6 — без одиниць.');
});

describe('contrast', () => {
  it('the text has at least 4.5:1 contrast', () => {
    const low = paragraphs().map((p) => contrast(p)).filter((ratio) => ratio < 4.5);
    expect(low, 'Абзаци з контрастом менше 4.5').toEqual([]);
  }, 'Блідий #9ca3af дає ~2.5 : 1. Візьми темніший колір, наприклад #1f2937.');

  it('links have at least 4.5:1 contrast and are underlined', () => {
    $$('article a').forEach((a) => {
      expect(contrast(a) >= 4.5, `Контраст посилання «${text(a)}» — ${contrast(a)} : 1.`).toBe(true);
      expect(css(a, 'text-decoration-line').includes('underline'), 'Посилання в тексті мають бути підкреслені.').toBe(true);
    });
  }, 'a { color: #1d4ed8; text-decoration: underline; }');
});

describe('line length', () => {
  it('the article is at most 65ch wide and centered', () => {
    const article = must($('article'), 'Немає article.');
    const probe = document.createElement('div');
    probe.style.cssText = 'width: 65ch; height: 0;';
    article.append(probe);
    const limit = box(probe).width;
    probe.remove();
    const b = box(article);
    expect(b.width <= limit + 1, `Стаття ${Math.round(b.width)}px — ширше за 65ch (${Math.round(limit)}px).`).toBe(true);
    expect(Math.abs(b.left - (document.documentElement.clientWidth - b.right)) <= 1, 'Стаття не по центру: margin: 0 auto.').toBe(true);
  }, 'article { max-width: 65ch; margin: 0 auto; }');
});
