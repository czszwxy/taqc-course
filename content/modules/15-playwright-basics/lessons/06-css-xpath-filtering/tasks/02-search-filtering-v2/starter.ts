import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/playground/search');
});

test('in-stock products can be added to the cart', async ({ page }) => {
  const cards = page.getByTestId('results').getByRole('listitem');
  const firstInStock = cards.filter({ hasNotText: 'Out of stock' }).first();

  await expect(firstInStock.getByRole('button', { name: 'Add to cart' })).toBeEnabled();
});

// твій код тут: кнопки товарів Out of stock і Clear filters
