import { formatTestName } from './solution';

describe('formatTestName', () => {
  it('without a tag returns the name', () => {
    expect(formatTestName('login works')).toBe('login works');
  });

  it("with a tag appends ' @tag'", () => {
    expect(formatTestName('login works', 'smoke')).toBe('login works @smoke');
  }, 'Формат: пробіл, @, тег.');

  it('an empty tag is treated as no tag', () => {
    expect(formatTestName('login works', '')).toBe('login works');
  }, "Порожній рядок falsy. Перевірка if (tag) його відсікає.");

  it('works with other tags', () => {
    expect(formatTestName('checkout total', 'regression')).toBe('checkout total @regression');
  });
});
