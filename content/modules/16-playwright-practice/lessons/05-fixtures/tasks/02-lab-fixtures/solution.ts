import { test as base, expect, type Page } from '@playwright/test';

type LabFixtures = {
  consoleErrors: string[];
  lab: Page;
};

const test = base.extend<LabFixtures>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await use(errors);
  },

  lab: async ({ page, consoleErrors }, use) => {
    expect(consoleErrors).toEqual([]);
    await page.goto('/playground/devtools');
    await use(page);
  },
});

test('enabling the disabled Apply button does not give a discount', async ({ lab }) => {
  const apply = lab.getByTestId('apply-promo');
  await expect(apply).toBeDisabled();

  await apply.evaluate((button) => button.removeAttribute('disabled'));
  await apply.click();

  await expect(lab.getByTestId('promo-message')).toContainText('Server rejected the request (403)');
});

test('Calculate total shows the total without console errors', async ({ lab, consoleErrors }) => {
  await lab.getByRole('button', { name: 'Calculate total' }).click();

  await expect(lab.getByTestId('total-message')).toHaveText(/^Total: /);
  expect(consoleErrors).toEqual([]);
});

test('Log out removes the cart from localStorage', async ({ lab }) => {
  await expect.poll(() => lab.evaluate(() => localStorage.getItem('lab:cart'))).not.toBeNull();

  await lab.getByRole('button', { name: 'Log out' }).click();

  await expect.poll(() => lab.evaluate(() => localStorage.getItem('lab:cart'))).toBeNull();
});
