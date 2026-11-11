import { test, expect } from '@playwright/test';

test('slow endpoint returns the waited time', async ({ page }) => {
  await page.goto('/playground/api');

  // 1. Швидкий запит GET /api/health (URL уже заповнений)
  await page.getByRole('button', { name: 'Send' }).click();

  // 2. Повільний запит: сервер відповідає через 1,5 секунди
  await page.getByLabel('URL').fill('/api/slow?ms=1500');
  await page.getByRole('button', { name: 'Send' }).click();

  await page.waitForTimeout(500); // "на моєму комп'ютері вистачало"
  const body = await page.getByTestId('api-response-body').textContent();
  expect(body).toContain('"waitedMs": 1500');
});
