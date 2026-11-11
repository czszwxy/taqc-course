import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/playground/cart');
});

test('Plus member gets free shipping', async ({ page }) => {
  await page.getByLabel(/Gadgetly Plus/).check();

  await expect(page.getByTestId('shipping')).toHaveText('Free');
});

test('Remove deletes exactly the clicked item', async ({ page }) => {
  const rows = page.getByTestId('cart-items').getByRole('listitem');

  await rows.filter({ hasText: 'Wireless mouse M2' }).getByRole('button', { name: 'Remove' }).click();

  await expect(rows.filter({ hasText: 'Wireless mouse M2' })).toHaveCount(0);
  await expect(rows.filter({ hasText: 'Mechanical keyboard K8' })).toBeVisible();
  await expect(rows.filter({ hasText: 'USB-C cable 1 m' })).toBeVisible();
  await expect(page.getByTestId('subtotal')).toHaveText('2,000 UAH');
});

test('Plus member keeps free shipping with SAVE10', async ({ page }) => {
  await page.getByLabel(/Gadgetly Plus/).check();
  await page.getByLabel('Promo code').fill('SAVE10');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByTestId('shipping')).toHaveText('Free');
  await expect(page.getByTestId('total')).toHaveText('2,250 UAH');
});
