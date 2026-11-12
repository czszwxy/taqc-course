import { test, expect, type Locator, type Page } from '@playwright/test';

type Delivery = 'Pickup in store' | 'Post office' | 'Courier';

class CheckoutPage {
  readonly subtotal: Locator;
  readonly discount: Locator;
  readonly delivery: Locator;
  readonly total: Locator;

  constructor(readonly page: Page) {
    this.subtotal = page.getByTestId('summary-subtotal');
    this.discount = page.getByTestId('summary-discount');
    this.delivery = page.getByTestId('summary-delivery');
    this.total = page.getByTestId('summary-total');
  }

  async open(): Promise<void> {
    await this.page.goto('/playground/checkout');
    await expect(this.subtotal).toBeVisible(); // the first quote has arrived
  }

  // твій код тут: increaseButton(product), quantity(productId), chooseDelivery(method), address, applyPromo(code), removePromo()
}

test.describe('Checkout page', () => {
  let checkout: CheckoutPage;

  test.beforeEach(async ({ page }) => {
    checkout = new CheckoutPage(page);
    await checkout.open();
  });

  test('shows the default order summary', async () => {
    await expect(checkout.subtotal).toHaveText('5,500 UAH');
    await expect(checkout.delivery).toHaveText('70 UAH');
    await expect(checkout.total).toHaveText('5,570 UAH');
  });

  // твій код тут
});
