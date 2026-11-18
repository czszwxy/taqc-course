const root = document.documentElement;
const token = (name) => window.getComputedStyle(root).getPropertyValue(name).trim().toLowerCase();
const primary = () => must($('.button-primary'), 'Основна кнопка зникла.');
const secondary = () => must($('.button-secondary'), 'Другорядна кнопка зникла.');

/** Sets tokens on <html> (like a theme switcher would), runs check, then removes them. */
function withTokens(values, check) {
  Object.entries(values).forEach(([name, value]) => root.style.setProperty(name, value));
  try {
    check();
  } finally {
    Object.keys(values).forEach((name) => root.style.removeProperty(name));
  }
}

describe('tokens', () => {
  it('the five tokens are declared on :root', () => {
    expect([token('--color-brand'), token('--color-text'), token('--color-surface'), token('--space'), token('--radius')]).toEqual(['#1d4ed8', '#1f2937', '#f9fafb', '16px', '8px']);
  }, ':root { --color-brand: #1d4ed8; --color-text: #1f2937; --color-surface: #f9fafb; --space: 16px; --radius: 8px; }');

  it('the page looks the same as before', () => {
    expect([color(document.body), color(document.body, 'background-color')]).toEqual([rgb('#1f2937'), rgb('#f9fafb')]);
    expect([color(primary(), 'background-color'), color(secondary()), css(primary(), 'padding-top'), css(primary(), 'padding-left')]).toEqual([rgb('#1d4ed8'), rgb('#1d4ed8'), '8px', '16px']);
  }, 'Значення змінних такі самі, як були в правилах, тож вигляд не змінюється.');
});

describe('changing a token changes the page', () => {
  it('--color-brand repaints both buttons', () => {
    withTokens({ '--color-brand': '#7c3aed' }, () => {
      const violet = rgb('#7c3aed');
      expect([color(primary(), 'background-color'), color(primary(), 'border-top-color'), color(secondary()), color(secondary(), 'border-top-color')]).toEqual([violet, violet, violet, violet]);
    });
  }, 'У кнопках лишився жорстко прописаний #1d4ed8: фон і рамка основної, текст і рамка другорядної — усе через var(--color-brand).');

  it('--color-text and --color-surface repaint the page', () => {
    withTokens({ '--color-text': '#000000', '--color-surface': '#ffffff' }, () => {
      expect([color(document.body), color(document.body, 'background-color')]).toEqual([rgb('#000000'), rgb('#ffffff')]);
    });
  }, 'body { color: var(--color-text); background-color: var(--color-surface); }');

  it('--space changes the paddings', () => {
    withTokens({ '--space': '20px' }, () => {
      expect([css(must($('.card'), 'Картка зникла.'), 'padding-top'), css(primary(), 'padding-top'), css(primary(), 'padding-left'), css(secondary(), 'padding-top'), css(secondary(), 'padding-left')]).toEqual(['20px', '10px', '20px', '10px', '20px']);
    });
  }, 'Картка — padding: var(--space); кнопки — padding: calc(var(--space) / 2) var(--space).');

  it('--radius changes all corners', () => {
    withTokens({ '--radius': '2px' }, () => {
      expect([css($('.card'), 'border-top-left-radius'), css(primary(), 'border-top-left-radius'), css(secondary(), 'border-top-left-radius')]).toEqual(['2px', '2px', '2px']);
    });
  }, 'border-radius: var(--radius) у картки й обох кнопок.');
});
