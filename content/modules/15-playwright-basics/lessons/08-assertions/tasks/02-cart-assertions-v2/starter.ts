import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/playground/cart');
});

test('Plus member gets free shipping', async ({ page }) => {
  await page.getByLabel(/Gadgetly Plus/).check();

  await expect(page.getByTestId('shipping')).toHaveText('Free');
});

// твій код тут: Remove видаляє саме той рядок; Plus + SAVE10
