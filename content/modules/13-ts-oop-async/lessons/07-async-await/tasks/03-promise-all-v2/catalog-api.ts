const PRICES: Record<number, number> = { 1: 499, 2: 1299, 3: 2199, 4: 249 };

export const LATENCY_MS = 80;

export function getPrice(productId: number): Promise<number> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const price = PRICES[productId];
      if (price === undefined) reject(new Error(`Product ${productId} not found`));
      else resolve(price);
    }, LATENCY_MS);
  });
}
