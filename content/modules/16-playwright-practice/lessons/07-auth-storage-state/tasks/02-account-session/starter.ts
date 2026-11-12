import { test, expect, type Page } from '@playwright/test';

const USER = { email: 'qa@gadgetly.test', password: 'Test1234' };

async function signInViaUi(page: Page): Promise<void> {
  await page.goto('/playground/account');
  await page.getByLabel('Email').fill(USER.email);
  await page.getByLabel('Password').fill(USER.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
}

test('the session survives a reload', async ({ page }) => {
  await signInViaUi(page);

  await page.reload();

  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
});

// твій код тут: Sign out забуває сесію (і після reload); вхід без форми через API-токен і storageState
