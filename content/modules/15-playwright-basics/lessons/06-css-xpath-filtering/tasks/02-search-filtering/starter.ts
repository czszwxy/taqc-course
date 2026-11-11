import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/playground/search');
});

test('search is case-insensitive', async ({ page }) => {
  const cards = page.getByTestId('results').getByRole('listitem');

  await page.getByLabel('Search').fill('mouse');

  await expect(cards).toHaveCount(2);
  await expect(cards.filter({ hasText: 'Gaming Mouse X7' })).toBeVisible();
});

// твій код тут: In stock only + лічильник, сортування Price: high to low, включна максимальна ціна
