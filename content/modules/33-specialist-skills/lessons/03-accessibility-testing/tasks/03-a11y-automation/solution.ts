import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/playground/a11y');
});

test('the wishlist icon button has a name and a pressed state', async ({ page }) => {
  const wishlist = page.getByRole('button', { name: 'Add to wishlist' });

  await wishlist.click();

  await expect(wishlist).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('wishlist-status')).toHaveText('Saved to your wishlist');
});

test('the page has no automatically detectable WCAG A/AA violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

test('"Show details" is a button that works from the keyboard', async ({ page }) => {
  const toggle = page.getByRole('button', { name: 'Show details' });

  await toggle.focus();
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('details')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hide details' })).toHaveAttribute('aria-expanded', 'true');
});

test('the email error is announced and linked to the field', async ({ page }) => {
  await page.getByRole('button', { name: 'Subscribe' }).click();

  await expect(page.getByRole('alert')).toHaveText('Enter a valid email address');
  await expect(page.getByRole('textbox', { name: 'Email' })).toHaveAccessibleDescription('Enter a valid email address');
});

test('the dialog takes focus, closes on Escape and returns focus', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Email' }).fill('qa@example.test');
  await page.getByRole('button', { name: 'Subscribe' }).click();

  const dialog = page.getByRole('dialog', { name: "You're subscribed!" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();

  await page.keyboard.press('Escape');

  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Subscribe' })).toBeFocused();
});
