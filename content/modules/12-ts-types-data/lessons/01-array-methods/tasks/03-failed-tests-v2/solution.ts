export type Product = { name: string; price: number; inStock: boolean };

export function namesInStock(products: Product[]): string[] {
  return products.filter((p) => p.inStock).map((p) => p.name);
}

export function findByName(products: Product[], name: string): Product | undefined {
  return products.find((p) => p.name === name);
}
