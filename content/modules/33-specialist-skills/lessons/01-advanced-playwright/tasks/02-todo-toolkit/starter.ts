import { test, expect as baseExpect, type Page } from '@playwright/test';

// твій код тут: const expect = baseExpect.extend({ async toHaveItemsLeft(page: Page, count: number) { ... } });
const expect = baseExpect;

test('adding a task increases the counter', async ({ page }) => {
  await test.step('Open the to-do list', async () => {
    await page.goto('/playground/todo');
  });

  await test.step('Add a task', async () => {
    const input = page.getByPlaceholder('What needs to be done?');
    await input.fill('Pay the electricity bill');
    await input.press('Enter');
  });

  await test.step('The counter shows three active tasks', async () => {
    await expect(page.getByTestId('todo-counter')).toHaveText('3 items left');
  });
});

// твій код тут: однина в лічильнику, видалення активної задачі, збереження в localStorage (expect.poll)
