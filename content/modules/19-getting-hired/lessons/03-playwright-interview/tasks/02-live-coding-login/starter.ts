import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/playground/login');
});

test('demo user can sign in', async ({ page }) => {
  // твій код тут — і ще щонайменше 3 тести на вимоги з умови
  await expect(page.getByRole('heading', { name: 'Sign in to Taskly' })).toBeVisible();
});
