import { test, expect, type Page } from '@playwright/test';

async function signIn(page: Page): Promise<void> {
  await page.goto('/playground/account');
  await page.getByLabel('Email').fill('qa@gadgetly.test');
  await page.getByLabel('Password').fill('Test1234');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test('Export shows an alert, then a status', async ({ page }) => {
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('Your data export has started. We will email you a link.');
    await dialog.accept();
  });

  await page.getByRole('button', { name: 'Export my data' }).click();

  await expect(page.getByTestId('export-status')).toHaveText('Export requested');
});

// твій код тут: Cancel у Delete account, порожнє ім'я в Rename, Terms у новій вкладці, Help chat у фреймі
