import { test, expect, type Page } from '@playwright/test';

async function logIn(page: Page, email: string, password: string): Promise<void> {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/playground/login');
});

test('demo user can sign in', async ({ page }) => {
  await logIn(page, 'demo@taskly.test', 'Demo1234');
  await expect(page.getByTestId('signed-in-as')).toHaveText('Signed in as demo@taskly.test');
});

test('three wrong passwords lock the account', async ({ page }) => {
  for (const attempt of ['wrong-1', 'wrong-2', 'wrong-3']) {
    await logIn(page, 'demo@taskly.test', attempt);
  }
  await expect(page.getByRole('alert')).toHaveText('Too many failed attempts. Try again in 15 minutes.');

  await logIn(page, 'demo@taskly.test', 'Demo1234');
  await expect(page.getByRole('alert')).toHaveText('Too many failed attempts. Try again in 15 minutes.');
});

test('spaces around the email are ignored', async ({ page }) => {
  await logIn(page, '  demo@taskly.test  ', 'Demo1234');
  await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
});

test('forgot password needs an email', async ({ page }) => {
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('alert')).toHaveText('Enter your email first');
});

test('without Remember me the email is not kept after log out', async ({ page }) => {
  await logIn(page, 'demo@taskly.test', 'Demo1234');
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByLabel('Email')).toHaveValue('');
});
