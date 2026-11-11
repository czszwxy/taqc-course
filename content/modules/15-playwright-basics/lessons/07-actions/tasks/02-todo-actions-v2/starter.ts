import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/playground/todo');
});

test('Completed tab shows only completed tasks', async ({ page }) => {
  await page.getByRole('tab', { name: 'Completed' }).click();

  await expect(page.getByTestId('todo-item')).toHaveCount(1);
  await expect(page.getByTestId('todo-item')).toContainText('Write test cases for the login page');
});

// твій код тут: межа 100/101 символ і лічильник «1 item left»
