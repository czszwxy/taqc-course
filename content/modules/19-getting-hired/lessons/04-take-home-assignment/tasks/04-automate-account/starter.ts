import { test, expect, type Page } from '@playwright/test';

async function signIn(page: Page): Promise<void> {
  await page.goto('/playground/account');
  await page.getByLabel('Email').fill('qa@gadgetly.test');
  await page.getByLabel('Password').fill('Test1234');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
}

test('the session survives a reload', async ({ page }) => {
  await signIn(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
});

// твій код тут: Sign out + reload, Cancel у Delete account, порожнє ім'я в Rename, 500 від /api/orders
