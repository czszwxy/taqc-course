import { test, expect } from '@playwright/test';

test('shows the sign-in form', async ({ page }) => {
  await page.goto('/playground/login');

  await expect(page.getByRole('heading', { name: 'Sign in to Taskly' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
});

test('demo user can sign in', async ({ page }) => {
  await page.goto('/playground/login');

  await page.getByLabel('Email').fill('demo@taskly.test');
  await page.getByLabel('Password', { exact: true }).fill('Demo1234');
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
  await expect(page.getByTestId('signed-in-as')).toHaveText('Signed in as demo@taskly.test');
});
