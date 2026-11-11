import { test, expect, type Page } from '@playwright/test';

async function logIn(page: Page, email: string, password: string): Promise<void> {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/playground/login');
});

test('wrong password shows a generic error', async ({ page }) => {
  await logIn(page, 'demo@taskly.test', 'wrong-password');

  await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
});

// твій код тут: заблокований акаунт, Forgot password з порожнім email, email у верхньому регістрі з пробілами
