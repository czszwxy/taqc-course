import { test as base, expect, type Page } from '@playwright/test';

type LabFixtures = {
  lab: Page;
};

const test = base.extend<LabFixtures>({
  lab: async ({ page }, use) => {
    await page.goto('/playground/devtools');
    await use(page);
  },
});

test('enabling the disabled Apply button does not give a discount', async ({ lab }) => {
  const apply = lab.getByTestId('apply-promo');
  await expect(apply).toBeDisabled();

  await apply.evaluate((button) => button.removeAttribute('disabled'));
  await apply.click();

  await expect(lab.getByTestId('promo-message')).toContainText('Server rejected the request (403)');
});

// твій код тут: фікстура consoleErrors, тест Calculate total без помилок у консолі, тест Log out і localStorage
