import { applyDiscount } from './solution';

describe('applyDiscount', () => {
  it('100 with 20% → 80', () => {
    expect(applyDiscount(100, 20)).toBe(80);
  });

  it('rounds to cents: 19.99 with 10% → 17.99', () => {
    expect(applyDiscount(19.99, 10)).toBe(17.99);
  }, 'Без округлення вийде 17.991. Використай Math.round(value * 100) / 100.');

  it('0% discount keeps the price', () => {
    expect(applyDiscount(50, 0)).toBe(50);
  });

  it('100% discount → 0', () => {
    expect(applyDiscount(80, 100)).toBe(0);
  });

  it('returns a number, not a string', () => {
    expect(typeof applyDiscount(10, 5)).toBe('number');
  }, 'toFixed() повертає рядок. Потрібне число.');
});
