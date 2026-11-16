import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // The page will think it is 12:00:00 UTC: the deal ends at 12:05:00.
  await page.clock.install({ time: new Date('2026-03-20T12:00:00Z') });
  await page.goto('/playground/deal');
});

test('the deal price is shown while the deal is active', async ({ page }) => {
  await page.clock.pauseAt(new Date('2026-03-20T12:00:10Z'));

  await expect(page.getByTestId('deal-timer')).toHaveText('04:50');
  await expect(page.getByTestId('deal-price')).toHaveText('2,399 UAH');
  await expect(page.getByRole('button', { name: 'Buy now' })).toBeEnabled();
});

// твій код тут: таймер за 9 секунд до кінця, стан після завершення акції, зникнення повідомлення
