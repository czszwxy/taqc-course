export interface Product {
  id: number;
  name: string;
  price: number;
  inStock: boolean;
}

export function isProduct(value: unknown): value is Product {
  // твій код тут
}

export function isProductList(value: unknown): value is Product[] {
  // твій код тут
}
