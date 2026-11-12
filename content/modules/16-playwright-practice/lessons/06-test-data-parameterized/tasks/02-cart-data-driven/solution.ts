import { test, expect } from '@playwright/test';

const QUANTITIES = [
  { qty: '0', error: true, lineTotal: '' },
  { qty: '1', error: false, lineTotal: '500 UAH' },
  { qty: '10', error: false, lineTotal: '5,000 UAH' },
  { qty: '11', error: true, lineTotal: '' },
];

const PROMO_CODES = ['SAVE10', 'save10', '  Save10  '];

const SHIPPING = [
  { cables: '3', subtotal: '2,750 UAH', shipping: '100 UAH' },
  { cables: '4', subtotal: '3,000 UAH', shipping: 'Free' },
  { cables: '5', subtotal: '3,250 UAH', shipping: 'Free' },
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

for (const code of PROMO_CODES) {
  test(`promo code "${code}" gives 10% off`, async ({ page }) => {
    await page.getByLabel('Promo code').fill(code);
    await page.getByRole('button', { name: 'Apply' }).click();

    await expect(page.getByTestId('discount')).toContainText('250 UAH');
  });
}

for (const { cables, subtotal, shipping } of SHIPPING) {
  test(`${cables} cables: subtotal ${subtotal}, shipping ${shipping}`, async ({ page }) => {
    await page.getByLabel('Quantity of USB-C cable 1 m').fill(cables);

    await expect(page.getByTestId('subtotal')).toHaveText(subtotal);
    await expect(page.getByTestId('shipping')).toHaveText(shipping);
  });
}
