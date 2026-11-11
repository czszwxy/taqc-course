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
  // твій код тут
}

export async function getJson<T>(path: string, isT: (value: unknown) => value is T): Promise<T> {
  // твій код тут
}
