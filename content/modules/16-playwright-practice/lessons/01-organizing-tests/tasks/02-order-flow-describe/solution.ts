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
    test('can be paid', { tag: '@smoke' }, async ({ page }) => {
      await act(page, 'Pay');
      await expect(page.getByTestId('order-status')).toHaveText('Paid');
    });

    test('cannot be shipped before payment', async ({ page }) => {
      await act(page, 'Ship');
      await expect(page.getByRole('alert')).toHaveText('Ship is not allowed for an order in status Created');
      await expect(page.getByTestId('order-status')).toHaveText('Created');
    });
  });

  test.describe('Paid order', () => {
    test.beforeEach(async ({ page }) => {
      await act(page, 'Pay');
    });

    test('cancelling issues a refund', async ({ page }) => {
      await act(page, 'Cancel');
      await expect(page.getByTestId('order-status')).toHaveText('Cancelled');
      await expect(page.getByTestId('history-note')).toHaveText('Refund of 2,749 UAH issued');
    });
  });

  test.describe('Shipped order', () => {
    test.beforeEach(async ({ page }) => {
      await act(page, 'Pay', 'Ship');
    });

    test('cannot be cancelled', async ({ page }) => {
      await act(page, 'Cancel');
      await expect(page.getByRole('alert')).toHaveText('Cancel is not allowed for an order in status Shipped');
      await expect(page.getByTestId('order-status')).toHaveText('Shipped');
    });
  });

  test.describe('Delivered order', () => {
    test.beforeEach(async ({ page }) => {
      await act(page, 'Pay', 'Ship', 'Deliver');
    });

    test('can be returned', { tag: '@smoke' }, async ({ page }) => {
      await act(page, 'Return');
      await expect(page.getByTestId('order-status')).toHaveText('Returned');
    });
  });

  test.describe('Cancelled order', () => {
    test.beforeEach(async ({ page }) => {
      await act(page, 'Cancel');
    });

    test('cannot be paid again', async ({ page }) => {
      await act(page, 'Pay');
      await expect(page.getByRole('alert')).toHaveText('Pay is not allowed for an order in status Cancelled');
      await expect(page.getByTestId('order-status')).toHaveText('Cancelled');
    });
  });
});
