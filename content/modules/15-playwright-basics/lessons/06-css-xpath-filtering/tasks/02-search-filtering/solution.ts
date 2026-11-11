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

test('counter matches the cards when "In stock only" is on', async ({ page }) => {
  const cards = page.getByTestId('results').getByRole('listitem');

  await page.getByLabel('Category').selectOption('Laptops');
  await page.getByLabel('In stock only').check();

  await expect(cards).toHaveCount(2);
  await expect(page.getByTestId('result-count')).toHaveText('2 products found');
  await expect(cards.filter({ hasText: 'Out of stock' })).toHaveCount(0);
});

test('price high to low starts with the most expensive products', async ({ page }) => {
  const cards = page.getByTestId('results').getByRole('listitem');

  await page.getByLabel('Sort by').selectOption({ label: 'Price: high to low' });

  await expect(cards.first()).toContainText('Laptop Pro 15');
  await expect(cards.nth(1)).toContainText('Phone Ultra');
});

test('max price is inclusive', async ({ page }) => {
  const cards = page.getByTestId('results').getByRole('listitem');

  await page.getByLabel('Category').selectOption('Accessories');
  await page.getByLabel('Max price').fill('2199');

  await expect(cards.filter({ hasText: 'Mechanical Keyboard K8' })).toHaveCount(1);
});
