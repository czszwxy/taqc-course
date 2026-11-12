import { test, expect, type Page } from '@playwright/test';

/** Clicks the action buttons one after another, e.g. act(page, 'Pay', 'Ship'). */
async function act(page: Page, ...actions: string[]): Promise<void> {
  for (const action of actions) {
    await page.getByRole('button', { name: action, exact: true }).click();
  }
}

test.describe('Order status flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground/order');
    await expect(page.getByTestId('order-status')).toHaveText('Created');
  });

  test.describe('Created order', () => {
    test('can be paid', async ({ page }) => {
      await act(page, 'Pay');
      await expect(page.getByTestId('order-status')).toHaveText('Paid');
    });

    // твій код тут: не можна відправити без оплати
  });

  // твій код тут: групи Paid, Shipped, Delivered, Cancelled зі своїми beforeEach + тег @smoke
});
