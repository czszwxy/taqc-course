import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/playground/todo');
});

test('Completed tab shows only completed tasks', async ({ page }) => {
  await page.getByRole('tab', { name: 'Completed' }).click();

  await expect(page.getByTestId('todo-item')).toHaveCount(1);
  await expect(page.getByTestId('todo-item')).toContainText('Write test cases for the login page');
});

test('a task of exactly 100 characters is accepted', async ({ page }) => {
  const input = page.getByPlaceholder('What needs to be done?');

  await input.fill('a'.repeat(100));
  await input.press('Enter');

  await expect(page.getByTestId('todo-item')).toHaveCount(4);
});

test('a task of 101 characters is rejected', async ({ page }) => {
  const input = page.getByPlaceholder('What needs to be done?');

  await input.fill('a'.repeat(101));
  await input.press('Enter');

  await expect(page.getByRole('alert')).toHaveText('Task is too long (max 100 characters)');
  await expect(page.getByTestId('todo-item')).toHaveCount(3);
});

test('counter uses the singular for one active task', async ({ page }) => {
  const item = page.getByTestId('todo-item').filter({ hasText: 'Report the cart bug' });

  await item.getByRole('checkbox').check();

  await expect(page.getByTestId('todo-counter')).toHaveText('1 item left');
});
