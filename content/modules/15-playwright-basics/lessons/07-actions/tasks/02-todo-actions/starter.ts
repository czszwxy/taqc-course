import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/playground/todo');
});

test('Enter adds a new task', async ({ page }) => {
  const input = page.getByPlaceholder('What needs to be done?');

  await input.fill('Write Playwright tests');
  await input.press('Enter');

  await expect(page.getByTestId('todo-item').filter({ hasText: 'Write Playwright tests' })).toBeVisible();
  await expect(page.getByTestId('todo-counter')).toHaveText('3 items left');
});

// твій код тут: Esc скасовує редагування, Clear completed, видалення й лічильник, галочка після reload
