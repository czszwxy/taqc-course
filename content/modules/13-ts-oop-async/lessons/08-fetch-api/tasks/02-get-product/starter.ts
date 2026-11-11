export const BASE_URL = 'https://api.gadgetly.test';

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  inStock: boolean;
}

export async function getProduct(id: number): Promise<Product> {
  // твій код тут
}
