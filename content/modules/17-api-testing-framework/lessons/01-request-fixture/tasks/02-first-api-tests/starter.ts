import { test, expect } from '@playwright/test';

test('health check answers ok', async ({ request }) => {
  const response = await request.get('/api/health');

  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ status: 'ok' });
});

// твій код тут: фільтр товарів за категорією, успішний логін, неправильний пароль (401), логін без password (400)
