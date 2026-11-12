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

test('unchecking newsletter sends false', async ({ page }) => {
  await page.getByLabel('Subscribe to newsletter').uncheck();
  const requestPromise = page.waitForRequest((r) => r.url().includes('/lab/profile') && r.method() === 'POST');

  await page.getByRole('button', { name: 'Save profile' }).click();
  const request = await requestPromise;

  expect(request.postDataJSON()).toMatchObject({ newsletter: false });
});

test('Load orders sends the selected status', async ({ page }) => {
  await page.getByLabel('Status', { exact: true }).selectOption('shipped');
  const requestPromise = page.waitForRequest((r) => r.url().includes('/lab/orders'));

  await page.getByRole('button', { name: 'Load orders' }).click();
  const request = await requestPromise;

  expect(new URL(request.url()).searchParams.get('status')).toBe('shipped');
});

test('a server error on Save profile is shown', async ({ page }) => {
  await page.route('**/lab/profile', (route) => route.fulfill({ status: 500, json: { error: 'Server error' } }));

  await page.getByRole('button', { name: 'Save profile' }).click();

  await expect(page.getByTestId('profile-message')).toHaveText('Could not save the profile');
});
