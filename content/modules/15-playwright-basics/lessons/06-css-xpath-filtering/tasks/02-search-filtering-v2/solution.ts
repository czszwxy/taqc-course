import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/playground/search');
});

test('in-stock products can be added to the cart', async ({ page }) => {
  const cards = page.getByTestId('results').getByRole('listitem');
  const firstInStock = cards.filter({ hasNotText: 'Out of stock' }).first();

  await expect(firstInStock.getByRole('button', { name: 'Add to cart' })).toBeEnabled();
});

test('out-of-stock products have a disabled Add to cart button', async ({ page }) => {
  const outOfStock = page.getByTestId('results').getByRole('listitem').filter({ hasText: 'Out of stock' });

  await expect(outOfStock).toHaveCount(4);
  for (const card of await outOfStock.all()) {
    await expect(card.getByRole('button', { name: 'Add to cart' })).toBeDisabled();
  }
});

test('Clear filters also clears the search text', async ({ page }) => {
  const cards = page.getByTestId('results').getByRole('listitem');

  await page.getByLabel('Search').fill('Phone');
  await page.getByLabel('Category').selectOption('Phones');
  await page.getByRole('button', { name: 'Clear filters' }).click();

  await expect(page.getByLabel('Search')).toHaveValue('');
  await expect(cards).toHaveCount(14);
});
