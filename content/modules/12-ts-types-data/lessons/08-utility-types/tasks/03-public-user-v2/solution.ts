export interface Product {
  id: number;
  name: string;
  price: number;
}

export type NewProduct = Omit<Product, 'id'>;

export function createProduct(data: NewProduct, id: number): Product {
  return { id, ...data };
}
