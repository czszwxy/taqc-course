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

test('the timer keeps the mm:ss format in the last seconds', async ({ page }) => {
  await page.clock.pauseAt(new Date('2026-03-20T12:04:51Z'));

  await expect(page.getByTestId('deal-timer')).toHaveText('00:09');
});

test('when the time is up the deal ends', async ({ page }) => {
  await page.clock.pauseAt(new Date('2026-03-20T12:04:51Z'));

  await page.clock.fastForward('00:09');

  await expect(page.getByTestId('deal-ended')).toHaveText('Deal ended');
  await expect(page.getByTestId('deal-price')).toHaveText('2,999 UAH');
  await expect(page.getByRole('button', { name: 'Buy now' })).toBeDisabled();
});

test('the "Added to cart" message disappears after 5 seconds', async ({ page }) => {
  await page.clock.pauseAt(new Date('2026-03-20T12:01:00Z'));
  await page.getByRole('button', { name: 'Buy now' }).click();
  await expect(page.getByTestId('toast')).toContainText('Wireless Headphones H1');

  await page.clock.fastForward(5000);

  await expect(page.getByTestId('toast')).toHaveCount(0);
});
