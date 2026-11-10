import { formatTestIds } from './solution';

describe('formatTestIds', () => {
  it("3 → 'TC-01,TC-02,TC-03'", () => {
    expect(formatTestIds(3)).toBe('TC-01,TC-02,TC-03');
  });

  it("1 → 'TC-01' (no comma)", () => {
    expect(formatTestIds(1)).toBe('TC-01');
  }, 'Для одного елемента кома не потрібна.');

  it("0 → '' (empty string)", () => {
    expect(formatTestIds(0)).toBe('');
  });

  it('no trailing comma', () => {
    expect(formatTestIds(5).endsWith(',')).toBe(false);
  }, 'Кома ставиться тільки МІЖ елементами.');

  it('pads numbers to 2 digits and keeps 2-digit numbers as is', () => {
    const ids = formatTestIds(12);
    expect(ids.startsWith('TC-01,TC-02')).toBe(true);
    expect(ids.endsWith('TC-11,TC-12')).toBe(true);
  }, "padStart(2, '0') перетворює '7' на '07', а '12' залишає '12'.");
});
