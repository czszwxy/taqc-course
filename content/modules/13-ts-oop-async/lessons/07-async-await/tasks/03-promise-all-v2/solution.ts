import { getPrice } from './catalog-api';

export async function cartTotal(productIds: number[]): Promise<number> {
  const prices = await Promise.all(productIds.map((id) => getPrice(id)));
  return prices.reduce((sum, p) => sum + p, 0);
}
