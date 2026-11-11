import { priceLabel } from './solution';

describe('priceLabel', () => {
  it('uses formatMoney', () => {
    expect(priceLabel('Mouse', 499)).toBe('Mouse — 499 UAH');
    expect(priceLabel('Laptop', 32999)).toBe('Laptop — 32,999 UAH');
  });
});
