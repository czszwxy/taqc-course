import { test, expect } from '@playwright/test';

test.describe('user in Lviv', () => {
  test.use({ geolocation: { latitude: 49.84, longitude: 24.03 }, permissions: ['geolocation'] });

  test('the nearest store for Lviv is Lviv', async ({ page }) => {
    await page.goto('/playground/deal');

    await page.getByRole('button', { name: 'Find nearest store' }).click();

    await expect(page.getByTestId('store-result')).toHaveText('Nearest store: Lviv');
  });
});

// твій код тут: офлайн і повернення мережі, Харків → Kyiv, відмова в геолокації, часовий пояс Europe/Kyiv
