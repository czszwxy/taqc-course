import { test, expect, type Page } from '@playwright/test';

async function signIn(page: Page): Promise<void> {
  await page.goto('/playground/account');
  await page.getByLabel('Email').fill('qa@gadgetly.test');
  await page.getByLabel('Password').fill('Test1234');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
}

test('the session survives a reload', async ({ page }) => {
  await signIn(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
});

test('Sign out forgets the session', async ({ page }) => {
  await signIn(page);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
});

test('Cancel in Delete account keeps the account', async ({ page }) => {
  await signIn(page);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Delete account' }).click();
  await expect(page.getByTestId('account-deleted')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete account' })).toBeVisible();
});

test('an empty display name is rejected', async ({ page }) => {
  await signIn(page);
  const messages: string[] = [];
  page.on('dialog', async (dialog) => {
    messages.push(dialog.message());
    if (dialog.type() === 'prompt') await dialog.accept('');
    else await dialog.accept();
  });
  await page.getByRole('button', { name: 'Rename' }).click();
  await expect.poll(() => messages).toContain('Display name cannot be empty');
  await expect(page.getByTestId('display-name')).toHaveText('Olena Tester');
});

test('a server error on orders shows an error message', async ({ page }) => {
  await page.route('**/api/orders', (route) => route.fulfill({ status: 500, json: { error: 'Server error' } }));
  await signIn(page);
  await expect(page.getByRole('alert')).toHaveText('Could not load your orders.');
});
