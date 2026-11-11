import { isProduct, isProductList } from './solution';

const mouse = { id: 1, name: 'Mouse', price: 499, inStock: true };

describe('isProduct', () => {
  it('accepts a valid product', () => expect(isProduct(mouse)).toBe(true));
  it('allows extra fields', () => expect(isProduct({ ...mouse, rating: 4.5 })).toBe(true));
  it('rejects a wrong type in any field', () => {
    expect(isProduct({ ...mouse, id: '1' })).toBe(false);
    expect(isProduct({ ...mouse, name: 1 })).toBe(false);
    expect(isProduct({ ...mouse, price: '499' })).toBe(false);
    expect(isProduct({ ...mouse, inStock: 'yes' })).toBe(false);
  }, 'Перевір typeof для кожного з чотирьох полів.');
  it('rejects a missing field', () => {
    expect(isProduct({ id: 1, name: 'Mouse', price: 499 })).toBe(false);
  });
  it('rejects null, arrays and primitives', () => {
    expect(isProduct(null)).toBe(false);
    expect(isProduct([mouse])).toBe(false);
    expect(isProduct('Mouse')).toBe(false);
  }, 'typeof null === "object" і typeof [] === "object" — перевір їх окремо.');
});

describe('isProductList', () => {
  it('accepts a list of products', () => expect(isProductList([mouse, { ...mouse, id: 2 }])).toBe(true));
  it('accepts an empty list', () => expect(isProductList([])).toBe(true));
  it('rejects a list with one bad item', () => expect(isProductList([mouse, { id: 2 }])).toBe(false));
  it('rejects a non-array', () => expect(isProductList(mouse)).toBe(false));
});
