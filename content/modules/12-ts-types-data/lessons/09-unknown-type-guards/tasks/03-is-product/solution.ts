export interface Product {
  id: number;
  name: string;
  price: number;
  inStock: boolean;
}

export function isProduct(value: unknown): value is Product {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'number' && typeof v.name === 'string' && typeof v.price === 'number' && typeof v.inStock === 'boolean';
}

export function isProductList(value: unknown): value is Product[] {
  return Array.isArray(value) && value.every(isProduct);
}
