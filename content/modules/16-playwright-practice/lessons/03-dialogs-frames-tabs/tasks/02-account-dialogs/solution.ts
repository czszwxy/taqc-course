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

test('cancelling Delete account keeps the account', async ({ page }) => {
  page.once('dialog', (dialog) => dialog.dismiss());

  await page.getByRole('button', { name: 'Delete account' }).click();

  await expect(page.getByTestId('account-deleted')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete account' })).toBeVisible();
});

test('an empty display name is rejected', async ({ page }) => {
  const messages: string[] = [];
  page.on('dialog', async (dialog) => {
    messages.push(`${dialog.type()}: ${dialog.message()}`);
    if (dialog.type() === 'prompt') await dialog.accept('');
    else await dialog.accept();
  });

  await page.getByRole('button', { name: 'Rename' }).click();

  await expect.poll(() => messages).toEqual(['prompt: New display name', 'alert: Display name cannot be empty']);
  await expect(page.getByTestId('display-name')).toHaveText('Olena Tester');
});

test('Terms of Service opens in a new tab', async ({ page }) => {
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Terms of Service' }).click();
  const terms = await popupPromise;

  await expect(terms.getByRole('heading', { name: 'Gadgetly Terms of Service' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
});

test('help chat requires a question', async ({ page }) => {
  const chat = page.frameLocator('iframe[title="Help chat"]');

  await chat.getByRole('button', { name: 'Send' }).click();
  await expect(chat.getByRole('alert')).toHaveText('Please type your question');

  await chat.getByLabel('Your question').fill('Where is my order #1002?');
  await chat.getByRole('button', { name: 'Send' }).click();
  await expect(chat.getByRole('status')).toHaveText("Thanks! We'll reply within 24 hours.");
});
