export const CART_URL = '/cart';

export default class CartPage {
  url(): string {
    return CART_URL;
  }

  itemSelector(name: string): string {
    return `[data-testid="cart-item-${name}"]`;
  }
}
