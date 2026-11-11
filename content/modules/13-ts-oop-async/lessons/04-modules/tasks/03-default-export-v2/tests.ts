import CartPage, { CART_URL } from './solution';

describe('CartPage (default export)', () => {
  it('url', () => {
    expect(new CartPage().url()).toBe('/cart');
    expect(CART_URL).toBe('/cart');
  });
  it('itemSelector', () => {
    expect(new CartPage().itemSelector('mouse')).toBe('[data-testid="cart-item-mouse"]');
  });
});
