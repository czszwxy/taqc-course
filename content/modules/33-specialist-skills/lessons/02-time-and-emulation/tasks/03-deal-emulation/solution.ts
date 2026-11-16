import { test, expect } from '@playwright/test';

test.describe('user in Lviv', () => {
  test.use({ geolocation: { latitude: 49.84, longitude: 24.03 }, permissions: ['geolocation'] });

  test('the nearest store for Lviv is Lviv', async ({ page }) => {
    await page.goto('/playground/deal');

    await page.getByRole('button', { name: 'Find nearest store' }).click();

    await expect(page.getByTestId('store-result')).toHaveText('Nearest store: Lviv');
  });
});

test.describe('user in Kharkiv', () => {
  test.use({ geolocation: { latitude: 49.99, longitude: 36.23 }, permissions: ['geolocation'] });

  test('the nearest store for Kharkiv is Kyiv', async ({ page }) => {
    await page.goto('/playground/deal');

    await page.getByRole('button', { name: 'Find nearest store' }).click();

    await expect(page.getByTestId('store-result')).toHaveText('Nearest store: Kyiv');
  });
});

test('without the location permission the page explains what to do', async ({ page }) => {
  await page.goto('/playground/deal');

  await page.getByRole('button', { name: 'Find nearest store' }).click();

  await expect(page.getByTestId('store-error')).toHaveText('Location access denied. Choose a store from the list.');
});

test('offline: a banner is shown and buying is blocked until the connection is back', async ({ page, context }) => {
  await page.goto('/playground/deal');
  const buy = page.getByRole('button', { name: 'Buy now' });

  await context.setOffline(true);
  await expect(page.getByTestId('offline-banner')).toHaveText('You are offline. Reconnect to buy.');
  await expect(buy).toBeDisabled();

  await context.setOffline(false);
  await expect(page.getByTestId('offline-banner')).toHaveCount(0);
  await expect(buy).toBeEnabled();
});

test.describe('user in the Kyiv time zone', () => {
  test.use({ timezoneId: 'Europe/Kyiv' });

  test('the end time is shown in the user\'s time zone', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-03-20T12:00:00Z') });
    await page.goto('/playground/deal');

    await expect(page.getByTestId('deal-end-time')).toHaveText('14:05');
  });
});
