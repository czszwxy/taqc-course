export interface Product {
  id: number;
  name: string;
  price: number;
}

export type NewProduct = Product;

export function createProduct(data: NewProduct, id: number): Product {
  // твій код тут
}
