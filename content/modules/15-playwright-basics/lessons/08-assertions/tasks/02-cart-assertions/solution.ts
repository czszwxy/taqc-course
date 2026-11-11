import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/playground/cart');
});

test('initial totals', async ({ page }) => {
  await expect.soft(page.getByTestId('subtotal')).toHaveText('2,500 UAH');
  await expect.soft(page.getByTestId('shipping')).toHaveText('100 UAH');
  await expect.soft(page.getByTestId('total')).toHaveText('2,600 UAH');
});

test('shipping is free from exactly 3,000 UAH', async ({ page }) => {
  await page.getByLabel('Quantity of USB-C cable 1 m').fill('4');

  await expect.soft(page.getByTestId('subtotal')).toHaveText('3,000 UAH');
  await expect.soft(page.getByTestId('shipping')).toHaveText('Free');
  await expect.soft(page.getByTestId('total')).toHaveText('3,000 UAH');
});

test('promo code is case-insensitive and trimmed', async ({ page }) => {
  await page.getByLabel('Promo code').fill(' save10 ');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByTestId('discount')).toContainText('250 UAH');
  await expect(page.getByTestId('total')).toHaveText('2,350 UAH');
});

test('applying SAVE10 twice does not stack', async ({ page }) => {
  await page.getByLabel('Promo code').fill('SAVE10');
  await page.getByRole('button', { name: 'Apply' }).click();
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByTestId('discount')).toContainText('250 UAH');
  await expect(page.getByTestId('total')).toHaveText('2,350 UAH');
});

test('quantity 0 is rejected', async ({ page }) => {
  await page.getByLabel('Quantity of Wireless mouse M2').fill('0');

  await expect(page.getByRole('alert')).toHaveText('Quantity must be from 1 to 10');
  await expect(page.getByTestId('subtotal')).toHaveText('2,500 UAH');
});
