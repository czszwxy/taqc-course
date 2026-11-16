import { test, expect } from '@playwright/test';

test('search ignores the letter case', async ({ page }) => {
  await page.goto('/playground/search');

  await page.getByLabel('Search').fill('MOUSE');

  await expect(page.getByTestId('results').getByRole('listitem')).toHaveCount(2);
  await expect(page.getByTestId('result-count')).toHaveText('2 products found');
});

test('with "In stock only" the counter equals the number of cards', async ({ page }) => {
  await page.goto('/playground/search');

  await page.getByLabel('In stock only').check();

  await expect(page.getByTestId('results').getByRole('listitem')).toHaveCount(10);
  await expect(page.getByTestId('result-count')).toHaveText('10 products found');
});

test('"Price: high to low" sorts prices in descending order', async ({ page }) => {
  await page.goto('/playground/search');

  await page.getByLabel('Sort by').selectOption('price-desc');

  await expect(page.getByTestId('product-name').first()).toHaveText('Laptop Pro 15');
  const texts = await page.getByTestId('product-price').allInnerTexts();
  const prices = texts.map((text) => Number(text.replace(/\D/g, '')));
  expect(prices).toEqual([...prices].sort((a, b) => b - a));
});
