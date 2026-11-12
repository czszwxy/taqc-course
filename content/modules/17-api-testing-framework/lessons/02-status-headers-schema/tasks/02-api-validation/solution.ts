import { test, expect, type APIRequestContext } from '@playwright/test';

async function tokenFor(request: APIRequestContext, email: string, password: string): Promise<string> {
  const response = await request.post('/api/auth/login', { data: { email, password } });
  expect(response.status()).toBe(200);
  return (await response.json()).token;
}

test('products: headers and response shape', async ({ request }) => {
  const response = await request.get('/api/products');

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');
  expect(response.headers()['x-request-id']).toBeTruthy();

  const body = await response.json();
  expect(body).toMatchObject({ page: 1, limit: 10, total: 14 });
  for (const item of body.items) {
    expect(item).toEqual({
      id: expect.any(Number),
      name: expect.any(String),
      category: expect.any(String),
      price: expect.any(Number),
      rating: expect.any(Number),
      inStock: expect.any(Boolean),
    });
  }
});

test('pages do not overlap', async ({ request }) => {
  const page1 = await (await request.get('/api/products', { params: { page: 1, limit: 5 } })).json();
  const page2 = await (await request.get('/api/products', { params: { page: 2, limit: 5 } })).json();

  const ids1: number[] = page1.items.map((p: { id: number }) => p.id);
  const ids2: number[] = page2.items.map((p: { id: number }) => p.id);
  expect(ids2.filter((id) => ids1.includes(id))).toEqual([]);
  expect(ids2[0]).toBe(6);
});

test('orders need a token', async ({ request }) => {
  const response = await request.get('/api/orders');

  expect(response.status()).toBe(401);
  expect(response.headers()['www-authenticate']).toBe('Bearer');
  expect(await response.json()).toEqual({ error: 'Authorization header is missing' });
});

test("another user's order is forbidden", async ({ request }) => {
  const tarasToken = await tokenFor(request, 'taras@gadgetly.test', 'Taras1234');
  const olenaToken = await tokenFor(request, 'qa@gadgetly.test', 'Test1234');
  const created = await request.post('/api/orders', {
    headers: { Authorization: `Bearer ${tarasToken}` },
    data: { productId: 1, quantity: 1 },
  });
  expect(created.status()).toBe(201);
  const order = await created.json();

  try {
    const response = await request.get(`/api/orders/${order.id}`, { headers: { Authorization: `Bearer ${olenaToken}` } });
    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({ error: "You don't have access to this order" });
  } finally {
    await request.delete(`/api/orders/${order.id}`, { headers: { Authorization: `Bearer ${tarasToken}` } });
  }
});

test('limit above 50 is rejected', async ({ request }) => {
  const response = await request.get('/api/products', { params: { limit: 51 } });

  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ error: 'limit must not be greater than 50' });
});
