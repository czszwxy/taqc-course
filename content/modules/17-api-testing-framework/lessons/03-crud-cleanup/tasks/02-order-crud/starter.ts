import { test, expect, type APIRequestContext, type APIResponse } from '@playwright/test';

let token = '';
const created: number[] = [];

const auth = (): Record<string, string> => ({ Authorization: `Bearer ${token}` });

/** Creates an order and remembers its id for cleanup. */
async function createOrder(request: APIRequestContext, data: object): Promise<APIResponse> {
  const response = await request.post('/api/orders', { headers: auth(), data });
  if (response.ok()) created.push((await response.json()).id);
  return response;
}

test.beforeEach(async ({ request }) => {
  const response = await request.post('/api/auth/login', { data: { email: 'qa@gadgetly.test', password: 'Test1234' } });
  token = (await response.json()).token;
});

test.afterEach(async ({ request }) => {
  for (const id of created.splice(0)) {
    await request.delete(`/api/orders/${id}`, { headers: auth() });
  }
});

test('create an order', async ({ request }) => {
  const response = await createOrder(request, { productId: 1, quantity: 2 });

  expect(response.status()).toBe(201);
  const order = await response.json();
  expect(order).toMatchObject({ productId: 1, quantity: 2, unitPrice: 499, total: 998, status: 'created' });
  expect(response.headers()['location']).toMatch(new RegExp(`/orders/${order.id}$`));
});

// твій код тут: read, update (PATCH → total), delete (204, потім 404, повторний DELETE → 404), quantity 0 → 400
