import { test, expect, type APIRequestContext } from '@playwright/test';

const QUOTE = '/api/checkout/quote';

/** Cart with Headphones NC5 (101), Wireless Mouse M2 (103) and USB-C Cable (104). */
const cart = (headphones: number, mouse: number, cables: number) => [
  { productId: 101, quantity: headphones },
  { productId: 103, quantity: mouse },
  { productId: 104, quantity: cables },
];

async function quote(request: APIRequestContext, data: object) {
  const response = await request.post(QUOTE, { data });
  expect(response.status()).toBe(200);
  return response.json();
}

test('post office delivery costs 70 UAH', async ({ request }) => {
  const result = await quote(request, { items: cart(1, 1, 2), delivery: 'post' });
  expect(result).toMatchObject({ subtotal: 5500, deliveryFee: 70, total: 5570 });
});

test('courier is free from exactly 10,000 UAH', async ({ request }) => {
  const result = await quote(request, { items: cart(2, 1, 2), delivery: 'courier' });
  expect(result).toMatchObject({ subtotal: 10000, deliveryFee: 0, total: 10000 });
});

test('courier costs 150 UAH just below 10,000 UAH', async ({ request }) => {
  const result = await quote(request, { items: cart(2, 1, 1), delivery: 'courier' });
  expect(result).toMatchObject({ subtotal: 9750, deliveryFee: 150, total: 9900 });
});

test('WELCOME5 takes 5 % of the subtotal only', async ({ request }) => {
  const result = await quote(request, { items: cart(1, 1, 2), delivery: 'courier', promoCode: 'WELCOME5' });
  expect(result).toMatchObject({ subtotal: 5500, discount: 275, deliveryFee: 150, total: 5375 });
});

test('quantity 5 is accepted and quantity 6 is rejected', async ({ request }) => {
  await quote(request, { items: cart(1, 5, 1), delivery: 'post' });
  const tooMany = await request.post(QUOTE, { data: { items: cart(1, 6, 1), delivery: 'post' } });
  expect(tooMany.status()).toBe(400);
  expect((await tooMany.json()).error).toContain('quantity');
});
