import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/playground/devtools');
});

test('Save profile sends the form data', async ({ page }) => {
  const requestPromise = page.waitForRequest((r) => r.url().includes('/lab/profile') && r.method() === 'POST');

  await page.getByRole('button', { name: 'Save profile' }).click();
  const request = await requestPromise;

  expect(request.postDataJSON()).toEqual({ name: 'Olena', newsletter: true, language: 'uk' });
});

// твій код тут: newsletter false, статус у Load orders, помилка 500 на Save profile
