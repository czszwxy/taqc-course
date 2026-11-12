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

test('read the created order', async ({ request }) => {
  const order = await (await createOrder(request, { productId: 1, quantity: 2 })).json();

  const response = await request.get(`/api/orders/${order.id}`, { headers: auth() });

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual(order);
});

test('changing the quantity recalculates the total', async ({ request }) => {
  const order = await (await createOrder(request, { productId: 1, quantity: 2 })).json();

  const response = await request.patch(`/api/orders/${order.id}`, { headers: auth(), data: { quantity: 3 } });

  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ quantity: 3, total: 1497 });
});

test('a deleted order is gone', async ({ request }) => {
  const order = await (await createOrder(request, { productId: 1, quantity: 2 })).json();

  const deleted = await request.delete(`/api/orders/${order.id}`, { headers: auth() });
  expect(deleted.status()).toBe(204);

  const read = await request.get(`/api/orders/${order.id}`, { headers: auth() });
  expect(read.status()).toBe(404);

  const deletedAgain = await request.delete(`/api/orders/${order.id}`, { headers: auth() });
  expect(deletedAgain.status()).toBe(404);
});

test('quantity 0 is rejected', async ({ request }) => {
  const response = await createOrder(request, { productId: 1, quantity: 0 });

  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ error: 'quantity must be from 1 to 10' });
});
