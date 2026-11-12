import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'tablet', width: 900, height: 900 },
  { name: 'mobile', width: 375, height: 800 },
];

for (const vp of VIEWPORTS) {
  test(`product page looks right on ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/playground/responsive');

    await expect(page).toHaveScreenshot(`product-${vp.name}.png`, { fullPage: true });
  });
}
