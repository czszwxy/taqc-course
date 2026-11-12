import { test, expect, type Page } from '@playwright/test';

async function logIn(page: Page, email: string, password: string): Promise<void> {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/playground/login');
});

test('three failed attempts lock the account', async ({ page }) => {
  await logIn(page, 'demo@taskly.test', 'wrong-1');
  await logIn(page, 'demo@taskly.test', 'wrong-2');
  await logIn(page, 'demo@taskly.test', 'wrong-3');
  await expect(page.getByRole('alert')).toHaveText('Too many failed attempts. Try again in 15 minute.');

  await logIn(page, 'demo@taskly.test', 'Demo1234');
  await expect(page.getByRole('alert')).toHaveText('Too many failed attempts. Try again in 15 minutes.');
});

test('without "Remember me" the email is not kept after log out', async ({ page }) => {
  await logIn(page, 'demo@taskly.test', 'Demo1234');
  await page.getByRole('button', { name: 'Logout' }).click();

  await expect(page.getByLabel('Email')).toHaveValue('');
});

test('"Remember me" keeps the email after log out', async ({ page }) => {
  await page.getByLabel('Remember me').check();
  await logIn(page, 'demo@taskly.test', 'Demo1234');
  await page.getByRole('button', { name: 'Logout' }).click();

  await expect(page.getByLabel('Email')).toHaveValue('demo@taskly.test');
});
