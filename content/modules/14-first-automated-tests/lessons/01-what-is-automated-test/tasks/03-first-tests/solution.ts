import { discountedPrice } from './subject';

describe('discountedPrice', () => {
  it('applies a 10% discount', () => {
    // Arrange
    const price = 500;
    // Act
    const result = discountedPrice(price, 10);
    // Assert
    expect(result).toBe(450);
  });

  it('keeps the price for 0%', () => {
    expect(discountedPrice(499, 0)).toBe(499);
  });

  it('makes the item free for 100%', () => {
    expect(discountedPrice(499, 100)).toBe(0);
  });

  it('rounds to cents', () => {
    expect(discountedPrice(19.99, 15)).toBe(16.99);
  });

  it('rejects a percent outside 0..100', () => {
    expect(() => discountedPrice(100, 101)).toThrow(RangeError);
    expect(() => discountedPrice(100, -1)).toThrow(RangeError);
  });
});
