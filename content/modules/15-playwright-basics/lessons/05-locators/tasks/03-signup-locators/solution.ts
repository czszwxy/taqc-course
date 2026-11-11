import { test, expect, type Page } from '@playwright/test';

const VALID = {
  fullName: 'Olena Kovalenko',
  email: 'olena.k@example.com',
  age: '30',
  password: 'Secret123',
  confirm: 'Secret123',
  country: 'Ukraine',
};

/** Fills every field except the Terms checkbox. */
async function fillForm(page: Page, values: typeof VALID): Promise<void> {
  await page.getByLabel('Full name').fill(values.fullName);
  await page.getByLabel('Email').fill(values.email);
  await page.getByLabel('Age').fill(values.age);
  await page.getByLabel('Password', { exact: true }).fill(values.password);
  await page.getByLabel('Confirm password').fill(values.confirm);
  await page.getByLabel('Country').selectOption(values.country);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/playground/signup');
});

test('valid data creates an account and greets by full name', async ({ page }) => {
  await fillForm(page, VALID);
  await page.getByLabel('I agree to the Terms of Service').check();
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: 'Welcome, Olena Kovalenko!' })).toBeVisible();
});

test('Terms of Service must be accepted', async ({ page }) => {
  await fillForm(page, VALID);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByText('You must accept the Terms of Service')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Welcome/ })).toBeHidden();
});

test('passwords must match', async ({ page }) => {
  await fillForm(page, { ...VALID, confirm: 'Secret124' });
  await page.getByLabel('I agree to the Terms of Service').check();
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByText('Passwords do not match')).toBeVisible();
});

test('age 18 is accepted (lower boundary)', async ({ page }) => {
  await fillForm(page, { ...VALID, age: '18' });
  await page.getByLabel('I agree to the Terms of Service').check();
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: 'Welcome, Olena Kovalenko!' })).toBeVisible();
});
