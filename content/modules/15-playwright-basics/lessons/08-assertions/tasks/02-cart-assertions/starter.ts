import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/playground/cart');
});

test('initial totals', async ({ page }) => {
  await expect.soft(page.getByTestId('subtotal')).toHaveText('2,500 UAH');
  await expect.soft(page.getByTestId('shipping')).toHaveText('100 UAH');
  await expect.soft(page.getByTestId('total')).toHaveText('2,600 UAH');
});

// твій код тут: межа 3,000 для доставки, промокод у нижньому регістрі, SAVE10 двічі, кількість 0
