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

// твій код тут: порожній список, помилка 500, 500 → Try again → успіх, справжній запит з Authorization
