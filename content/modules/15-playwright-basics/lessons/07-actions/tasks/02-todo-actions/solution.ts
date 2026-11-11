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

test('Escape cancels editing', async ({ page }) => {
  const item = page.getByTestId('todo-item').filter({ hasText: 'Buy coffee' });

  await item.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Edit task').fill('Buy tea');
  await page.getByLabel('Edit task').press('Escape');

  await expect(page.getByTestId('todo-text').filter({ hasText: 'Buy coffee' })).toBeVisible();
  await expect(page.getByText('Buy tea')).toHaveCount(0);
});

test('Clear completed removes only completed tasks', async ({ page }) => {
  await page.getByRole('button', { name: 'Clear completed' }).click();

  await expect(page.getByTestId('todo-item')).toHaveCount(2);
  await expect(page.getByTestId('todo-item').filter({ hasText: 'Report the cart bug' })).toBeVisible();
});

test('deleting an active task updates the counter', async ({ page }) => {
  const item = page.getByTestId('todo-item').filter({ hasText: 'Buy coffee' });

  await item.getByRole('button', { name: /Delete/ }).click();

  await expect(item).toHaveCount(0);
  await expect(page.getByTestId('todo-counter')).toHaveText('1 item left');
});

test('completed state survives a reload', async ({ page }) => {
  const item = page.getByTestId('todo-item').filter({ hasText: 'Buy coffee' });

  await item.getByRole('checkbox').check();
  await page.reload();

  await expect(item.getByRole('checkbox')).toBeChecked();
});
