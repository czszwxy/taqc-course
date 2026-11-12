import { test, expect, type Page } from '@playwright/test';

async function signIn(page: Page): Promise<void> {
  await page.goto('/playground/account');
  await page.getByLabel('Email').fill('qa@gadgetly.test');
  await page.getByLabel('Password').fill('Test1234');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
}

test('shows the orders returned by the API', async ({ page }) => {
  await page.route('**/api/orders', (route) => route.fulfill({ json: { items: [{ id: 2001, status: 'paid', quantity: 3 }] } }));

  await signIn(page);

  await expect(page.getByTestId('orders')).toContainText('Order #2001');
  await expect(page.getByTestId('orders')).toContainText('3 pcs · paid');
});

test('an empty list shows "No orders yet"', async ({ page }) => {
  await page.route('**/api/orders', (route) => route.fulfill({ json: { items: [] } }));

  await signIn(page);

  await expect(page.getByTestId('orders-empty')).toHaveText('No orders yet');
});

test('a server error shows an error message', async ({ page }) => {
  await page.route('**/api/orders', (route) => route.fulfill({ status: 500, json: { error: 'Server error' } }));

  await signIn(page);

  await expect(page.getByRole('alert')).toHaveText('Could not load your orders.');
  await expect(page.getByTestId('orders-empty')).toHaveCount(0);
});

test('Try again loads the orders after an error', async ({ page }) => {
  let serverIsDown = true;
  await page.route('**/api/orders', async (route) => {
    if (serverIsDown) await route.fulfill({ status: 500, json: { error: 'Server error' } });
    else await route.fulfill({ json: { items: [{ id: 2002, status: 'created', quantity: 1 }] } });
  });

  await signIn(page);
  await expect(page.getByRole('alert')).toHaveText('Could not load your orders.');

  serverIsDown = false;
  await page.getByRole('button', { name: 'Try again' }).click();

  await expect(page.getByTestId('orders')).toContainText('Order #2002');
});

test('the real orders request carries the bearer token', async ({ page }) => {
  const requestPromise = page.waitForRequest('**/api/orders');

  await signIn(page);
  const request = await requestPromise;

  expect(request.method()).toBe('GET');
  expect(request.headers()['authorization']).toMatch(/^Bearer /);
});
