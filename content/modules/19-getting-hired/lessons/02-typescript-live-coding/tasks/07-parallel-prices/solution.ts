export interface PriceReport {
  prices: Record<number, number>;
  notFound: number[];
}

interface Product {
  id: number;
  price: number;
}

const BASE = 'https://api.gadgetly.test/api/products';

export async function getPrices(ids: number[]): Promise<PriceReport> {
  const responses = await Promise.all(ids.map((id) => fetch(`${BASE}/${id}`)));
  const report: PriceReport = { prices: {}, notFound: [] };
  for (let i = 0; i < ids.length; i++) {
    const res = responses[i];
    if (res.status === 404) {
      report.notFound.push(ids[i]);
      continue;
    }
    if (!res.ok) throw new Error(`Unexpected status ${res.status} for product ${ids[i]}`);
    const product = (await res.json()) as Product;
    report.prices[ids[i]] = product.price;
  }
  return report;
}
