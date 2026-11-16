import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/playground/a11y');
});

test('the wishlist icon button has a name and a pressed state', async ({ page }) => {
  const wishlist = page.getByRole('button', { name: 'Add to wishlist' });

  await wishlist.click();

  await expect(wishlist).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('wishlist-status')).toHaveText('Saved to your wishlist');
});

// твій код тут: скан axe (AxeBuilder), Show details з клавіатури, оголошена помилка email, фокус у діалозі та Escape
