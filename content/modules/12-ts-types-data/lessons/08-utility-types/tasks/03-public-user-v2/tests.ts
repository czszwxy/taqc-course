import { createProduct } from './solution';

export function compileTimeChecks(): void {
  // @ts-expect-error id is not part of NewProduct
  createProduct({ id: 1, name: 'X', price: 1 }, 2);
}

describe('createProduct', () => {
  it('adds the id', () => {
    expect(createProduct({ name: 'Mouse', price: 499 }, 15)).toEqual({ id: 15, name: 'Mouse', price: 499 });
  });
});
