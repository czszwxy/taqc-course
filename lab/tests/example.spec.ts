import { test, expect } from '@playwright/test';

/*
 * Your Playwright practice folder. Run from the project folder:
 *   npm run lab            — all tests in lab/tests, results in the terminal
 *   npm run lab -- --ui    — UI mode: pick tests, watch them step by step
 *   npm run lab:report     — open the HTML report of the last run
 * The pages here are the Bug Playground WITH its bugs, so a good test may fail — that means it found a bug!
 */

test('login page shows the sign-in form', async ({ page }) => {
  await page.goto('/playground/login');

  await expect(page.getByRole('heading', { name: 'Sign in to Taskly' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
});

test('demo user can sign in', async ({ page }) => {
  await page.goto('/playground/login');

  await page.getByLabel('Email').fill('demo@taskly.test');
  await page.getByLabel('Password', { exact: true }).fill('Demo1234');
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
  await expect(page.getByTestId('signed-in-as')).toHaveText('Signed in as demo@taskly.test');
});
