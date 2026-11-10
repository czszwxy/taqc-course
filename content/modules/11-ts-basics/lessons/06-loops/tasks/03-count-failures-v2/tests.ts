import { countDigits } from './solution';

describe('countDigits', () => {
  it("'Order 123-45' → 5", () => {
    expect(countDigits('Order 123-45')).toBe(5);
  });

  it('no digits → 0', () => {
    expect(countDigits('no digits')).toBe(0);
  });

  it('only digits', () => {
    expect(countDigits('0099')).toBe(4);
  }, "0 і 9 — теж цифри (межі діапазону '0'..'9').");

  it('empty string → 0', () => {
    expect(countDigits('')).toBe(0);
  });
});
