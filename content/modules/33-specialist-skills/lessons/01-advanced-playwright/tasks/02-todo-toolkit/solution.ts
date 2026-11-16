import { test, expect as baseExpect, type Page } from '@playwright/test';

const expect = baseExpect.extend({
  async toHaveItemsLeft(page: Page, count: number) {
    const expected = `${count} ${count === 1 ? 'item' : 'items'} left`;
    const counter = page.getByTestId('todo-counter');
    let pass = true;
    let actual = expected;
    try {
      await baseExpect(counter).toHaveText(expected);
    } catch {
      pass = false;
      actual = await counter.innerText();
    }
    return {
      pass,
      name: 'toHaveItemsLeft',
      expected,
      actual,
      message: () => `expected the counter "${expected}", got "${actual}"`,
    };
  },
});

const row = (page: Page, text: string) => page.getByTestId('todo-item').filter({ hasText: text });

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
    await expect(page).toHaveItemsLeft(3);
  });
});

test('one active task is counted in the singular', async ({ page }) => {
  await page.goto('/playground/todo');

  await test.step('Complete "Buy coffee"', async () => {
    await row(page, 'Buy coffee').getByRole('checkbox').check();
  });

  await test.step('One task is left', async () => {
    await expect(page).toHaveItemsLeft(1);
  });
});

test('deleting an active task decreases the counter', async ({ page }) => {
  await page.goto('/playground/todo');

  await test.step('Delete "Buy coffee"', async () => {
    await row(page, 'Buy coffee').getByRole('button', { name: /Delete/ }).click();
  });

  await test.step('Two rows and one active task are left', async () => {
    await expect(page.getByTestId('todo-item')).toHaveCount(2);
    await expect(page).toHaveItemsLeft(1);
  });
});

test('the completed state is saved to localStorage', async ({ page }) => {
  await page.goto('/playground/todo');

  await test.step('Complete "Buy coffee"', async () => {
    await row(page, 'Buy coffee').getByRole('checkbox').check();
  });

  await test.step('The saved list marks it as done', async () => {
    await expect
      .poll(async () => {
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('qa-playground:todo') ?? '[]') as { text: string; done?: boolean }[]);
        return saved.find((task) => task.text === 'Buy coffee')?.done;
      }, { message: 'the saved task should have done: true' })
      .toBe(true);
  });
});
