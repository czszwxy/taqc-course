export const BASE_URL = 'https://api.gadgetly.test';
export const UNAUTHORIZED = 401;

export async function createOrder(token: string, productId: number, quantity: number): Promise<number> {
  const response = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ productId, quantity }),
  });
  if (response.status === UNAUTHORIZED) throw new Error('Unauthorized');
  const body = (await response.json()) as { id?: number; error?: string };
  if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
  return body.id as number;
}
