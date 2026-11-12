import { test, expect } from '@playwright/test';

test('product page looks right on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/playground/responsive');

  await expect(page).toHaveScreenshot('product-desktop.png', { fullPage: true });
});

// твій код тут: tablet 900 × 900 і mobile 375 × 800
