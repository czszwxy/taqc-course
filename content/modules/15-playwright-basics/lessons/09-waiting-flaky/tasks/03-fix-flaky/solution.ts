import { test, expect } from '@playwright/test';

test('slow endpoint returns the waited time', async ({ page }) => {
  await page.goto('/playground/api');

  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByTestId('api-status')).toHaveText('200 OK');

  await page.getByLabel('URL').fill('/api/slow?ms=1500');
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByTestId('api-response-body')).toContainText('"waitedMs": 1500');
  await expect(page.getByTestId('api-status')).toHaveText('200 OK');
});

test('Send is disabled while the request is in progress', async ({ page }) => {
  await page.goto('/playground/api');
  const send = page.getByTestId('api-send');

  await page.getByLabel('URL').fill('/api/slow?ms=1500');
  await send.click();

  await expect(send).toBeDisabled();
  await expect(send).toBeEnabled();
  await expect(page.getByTestId('api-response-body')).toContainText('"waitedMs": 1500');
});
