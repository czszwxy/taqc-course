export interface PriceReport {
  prices: Record<number, number>;
  notFound: number[];
}

const BASE = 'https://api.gadgetly.test/api/products';

export async function getPrices(ids: number[]): Promise<PriceReport> {
  // твій код тут
}
