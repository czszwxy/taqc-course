import { test, expect } from '@playwright/test';

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

// твій код тут: пагінація без перетину, 401 без токена, 403 для чужого замовлення, limit=51 → 400
