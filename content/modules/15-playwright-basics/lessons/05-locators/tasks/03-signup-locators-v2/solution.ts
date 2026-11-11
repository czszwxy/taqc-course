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

test('locked account cannot sign in', async ({ page }) => {
  await logIn(page, 'locked@taskly.test', 'Locked123');

  await expect(page.getByRole('alert')).toHaveText('Your account is locked. Contact support.');
  await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeHidden();
});

test('forgot password needs an email', async ({ page }) => {
  await page.getByRole('button', { name: 'Forgot password?' }).click();

  await expect(page.getByRole('alert')).toHaveText('Enter your email first');
});

test('email is case-insensitive and trimmed', async ({ page }) => {
  await logIn(page, '  DEMO@Taskly.test  ', 'Demo1234');

  await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
});
