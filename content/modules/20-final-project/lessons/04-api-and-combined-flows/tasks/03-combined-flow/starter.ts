import { test, expect, type APIRequestContext } from '@playwright/test';

const PHONE = '+380671234567';
const ORDER = {
  items: [
    { productId: 101, quantity: 1 },
    { productId: 103, quantity: 1 },
    { productId: 104, quantity: 2 },
  ],
  delivery: 'post',
  promoCode: 'WELCOME5',
  customer: { name: 'Olena Tester', phone: PHONE, city: 'Kyiv', address: 'Post office 12' },
};

async function createOrder(request: APIRequestContext): Promise<number> {
  const response = await request.post('/api/checkout/orders', { data: ORDER });
  expect(response.status()).toBe(201);
  return (await response.json()).id;
}

async function deleteOrder(request: APIRequestContext, id: number, phone = PHONE): Promise<void> {
  const response = await request.delete(`/api/checkout/orders/${id}`, { params: { phone } });
  expect(response.status()).toBe(204);
}

test.describe('Order tracking', () => {
  let orderId: number;

  test.beforeEach(async ({ request }) => {
    orderId = await createOrder(request);
  });

  test.afterEach(async ({ request }) => {
    await deleteOrder(request, orderId);
  });

  test('the created order can be read back with its phone', async ({ request }) => {
    const response = await request.get(`/api/checkout/orders/${orderId}`, { params: { phone: PHONE } });
    expect(response.status()).toBe(200);
  });

  // твій код тут
});
