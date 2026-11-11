export const BASE_URL = 'https://api.gadgetly.test';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  inStock: boolean;
}

export function isProduct(value: unknown): value is Product {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'number' &&
    typeof v.name === 'string' &&
    typeof v.category === 'string' &&
    typeof v.price === 'number' &&
    typeof v.inStock === 'boolean'
  );
}

export async function getJson<T>(path: string, isT: (value: unknown) => value is T): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) throw new HttpError(response.status, `HTTP ${response.status}`);
  const data: unknown = await response.json();
  if (!isT(data)) throw new Error('Unexpected response shape');
  return data;
}
