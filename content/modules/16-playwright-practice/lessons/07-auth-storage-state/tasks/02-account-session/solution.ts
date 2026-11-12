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

test('Sign out forgets the session', async ({ page }) => {
  await signInViaUi(page);

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
});

test('a saved storageState skips the login form', async ({ browser, request }) => {
  const response = await request.post('/api/auth/login', { data: USER });
  expect(response.ok()).toBeTruthy();
  const { token } = (await response.json()) as { token: string };

  const context = await browser.newContext({
    storageState: {
      cookies: [],
      origins: [{ origin: 'http://localhost:5173', localStorage: [{ name: 'gadgetly:token', value: token }] }],
    },
  });
  const page = await context.newPage();
  await page.goto('/playground/account');

  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
  await expect(page.getByTestId('account-email')).toHaveText('Signed in as qa@gadgetly.test');
  await context.close();
});
