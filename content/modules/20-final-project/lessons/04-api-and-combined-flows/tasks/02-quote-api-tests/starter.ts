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

// твій код тут
