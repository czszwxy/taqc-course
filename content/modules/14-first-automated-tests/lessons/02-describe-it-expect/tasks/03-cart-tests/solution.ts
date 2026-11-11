import { averagePrice, cartSummary, findLine, parseQuantity, type CartLine } from './subject';

const lines: CartLine[] = [
  { name: 'Mouse', price: 500, qty: 2 },
  { name: 'Cable', price: 250, qty: 1 },
];

describe('cartSummary', () => {
  it('counts pieces, sums the total and keeps the order of names', () => {
    expect(cartSummary(lines)).toEqual({ count: 3, total: 1250, names: ['Mouse', 'Cable'] });
  });
  it('returns zeros for an empty cart', () => {
    expect(cartSummary([])).toEqual({ count: 0, total: 0, names: [] });
  });
});

describe('findLine', () => {
  it('finds a line by name', () => {
    expect(findLine(lines, 'Cable')).toEqual({ name: 'Cable', price: 250, qty: 1 });
  });
  it('returns undefined for an unknown name', () => {
    expect(findLine(lines, 'Laptop')).toBeUndefined();
  });
});

describe('averagePrice', () => {
  it('returns a non-rounded average', () => {
    const three: CartLine[] = [
      { name: 'a', price: 10, qty: 1 },
      { name: 'b', price: 20, qty: 1 },
      { name: 'c', price: 70, qty: 1 },
    ];
    expect(averagePrice(three)).toBeCloseTo(33.33, 2);
  });
});

describe('parseQuantity', () => {
  it('accepts the boundaries 1 and 10', () => {
    expect(parseQuantity('1')).toBe(1);
    expect(parseQuantity(' 10 ')).toBe(10);
  });
  it('rejects 0 and 11', () => {
    expect(() => parseQuantity('0')).toThrow('Invalid quantity');
    expect(() => parseQuantity('11')).toThrow('Invalid quantity');
  });
});
