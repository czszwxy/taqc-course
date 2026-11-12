import { test, expect } from '@playwright/test';

const QUANTITIES = [
  { qty: '0', error: true, lineTotal: '' },
  { qty: '1', error: false, lineTotal: '500 UAH' },
  { qty: '10', error: false, lineTotal: '5,000 UAH' },
  { qty: '11', error: true, lineTotal: '' },
];

test.beforeEach(async ({ page }) => {
  await page.goto('/playground/cart');
});

for (const { qty, error, lineTotal } of QUANTITIES) {
  test(`mouse quantity ${qty} is ${error ? 'rejected' : 'accepted'}`, async ({ page }) => {
    await page.getByLabel('Quantity of Wireless mouse M2').fill(qty);

    if (error) {
      await expect(page.getByRole('alert')).toHaveText('Quantity must be from 1 to 10');
    } else {
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expect(page.getByTestId('line-total-mouse')).toHaveText(lineTotal);
    }
  });
}

// твій код тут: таблиця промокодів і таблиця доставки (кількість кабелів → Subtotal, Shipping)
