import { test, expect } from '@playwright/test';

test('health check answers ok', async ({ request }) => {
  const response = await request.get('/api/health');

  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ status: 'ok' });
});

test('products can be filtered by category', async ({ request }) => {
  const response = await request.get('/api/products', { params: { category: 'Phones' } });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.total).toBe(3);
  for (const item of body.items) {
    expect(item.category).toBe('Phones');
  }
});

test('login returns a token for valid credentials', async ({ request }) => {
  const response = await request.post('/api/auth/login', { data: { email: 'qa@gadgetly.test', password: 'Test1234' } });

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.token).toBeTruthy();
  expect(body.user.email).toBe('qa@gadgetly.test');
});

test('a wrong password is 401', async ({ request }) => {
  const response = await request.post('/api/auth/login', { data: { email: 'qa@gadgetly.test', password: 'wrong' } });

  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ error: 'Invalid email or password' });
});

test('login without a password is 400', async ({ request }) => {
  const response = await request.post('/api/auth/login', { data: { email: 'qa@gadgetly.test' } });

  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ error: 'email and password are required' });
});
