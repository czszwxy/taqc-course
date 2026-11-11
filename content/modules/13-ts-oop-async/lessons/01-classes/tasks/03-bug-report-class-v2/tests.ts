import { Cart } from './solution';

describe('Cart', () => {
  it('starts empty', () => {
    const cart = new Cart();
    expect(cart.items).toEqual([]);
    expect(cart.count()).toBe(0);
    expect(cart.total()).toBe(0);
  });
  it('adds items and merges the same name', () => {
    const cart = new Cart();
    cart.add('Mouse', 500);
    cart.add('Cable', 250, 2);
    cart.add('Mouse', 500);
    expect(cart.items).toHaveLength(2);
    expect(cart.count()).toBe(4);
    expect(cart.total()).toBe(1500);
  }, 'Якщо товар з такою назвою вже є — збільш quantity, а не додавай новий рядок.');
});
