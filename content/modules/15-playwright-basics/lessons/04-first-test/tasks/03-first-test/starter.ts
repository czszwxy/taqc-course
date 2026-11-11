import { test, expect } from '@playwright/test';

test('shows the sign-in form', async ({ page }) => {
  await page.goto('/playground/login');
  // твій код тут: перевір заголовок "Sign in to Taskly", поля Email і Password та кнопку "Log in"
});

test('demo user can sign in', async ({ page }) => {
  await page.goto('/playground/login');
  // твій код тут: заповни demo@taskly.test / Demo1234, натисни "Log in" і перевір привітання
});
