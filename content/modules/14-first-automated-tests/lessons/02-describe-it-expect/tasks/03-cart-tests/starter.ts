import { averagePrice, cartSummary, findLine, parseQuantity, type CartLine } from './subject';

const lines: CartLine[] = [
  { name: 'Mouse', price: 500, qty: 1 },
];

describe('cart helpers', () => {
  it('summarizes the cart', () => {
    expect(cartSummary(lines).total).toBe(500);
  });

  // твій код тут: ще тести для findLine, averagePrice, parseQuantity…
});

void averagePrice;
void findLine;
void parseQuantity;
