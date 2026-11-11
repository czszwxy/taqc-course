import { findByName, namesInStock, type Product } from './solution';

const products: Product[] = [
  { name: 'Mouse', price: 499, inStock: true },
  { name: 'Keyboard', price: 2199, inStock: false },
  { name: 'Cable', price: 249, inStock: true },
];

describe('namesInStock', () => {
  it('returns names of products in stock', () => {
    expect(namesInStock(products)).toEqual(['Mouse', 'Cable']);
  }, 'filter за inStock, потім map за name.');

  it('returns [] for an empty list', () => {
    expect(namesInStock([])).toEqual([]);
  });
});

describe('findByName', () => {
  it('finds a product', () => {
    expect(findByName(products, 'Keyboard')).toEqual({ name: 'Keyboard', price: 2199, inStock: false });
  });

  it('returns undefined when not found', () => {
    expect(findByName(products, 'Laptop')).toBeUndefined();
  });
});
