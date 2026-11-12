import { test, expect, type Locator, type Page } from '@playwright/test';

type Delivery = 'Pickup in store' | 'Post office' | 'Courier';

class CheckoutPage {
  readonly subtotal: Locator;
  readonly discount: Locator;
  readonly delivery: Locator;
  readonly total: Locator;
  readonly address: Locator;

  constructor(readonly page: Page) {
    this.subtotal = page.getByTestId('summary-subtotal');
    this.discount = page.getByTestId('summary-discount');
    this.delivery = page.getByTestId('summary-delivery');
    this.total = page.getByTestId('summary-total');
    this.address = page.getByLabel('Address');
  }

  async open(): Promise<void> {
    await this.page.goto('/playground/checkout');
    await expect(this.subtotal).toBeVisible(); // the first quote has arrived
  }

  increaseButton(product: string): Locator {
    return this.page.getByRole('button', { name: `Increase ${product}` });
  }

  quantity(productId: number): Locator {
    return this.page.getByTestId(`qty-${productId}`);
  }

  async chooseDelivery(method: Delivery): Promise<void> {
    await this.page.getByRole('radio', { name: new RegExp(`^${method}`) }).check();
  }

  async applyPromo(code: string): Promise<void> {
    await this.page.getByLabel('Promo code').fill(code);
    await this.page.getByRole('button', { name: 'Apply' }).click();
  }

  async removePromo(): Promise<void> {
    await this.page.getByRole('button', { name: 'Remove promo code' }).click();
  }
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

  test('"+" is disabled at the maximum quantity of 5', async () => {
    const plus = checkout.increaseButton('Wireless Mouse M2');
    for (let quantity = 1; quantity < 5; quantity++) {
      await plus.click();
    }
    await expect(checkout.quantity(103)).toHaveText('5');
    await expect(plus).toBeDisabled();
  });

  test('the address field is hidden for pickup', async () => {
    await expect(checkout.address).toBeVisible();
    await checkout.chooseDelivery('Pickup in store');
    await expect(checkout.address).toBeHidden();
  });

  test('changing the delivery method re-prices the order', async () => {
    await checkout.chooseDelivery('Courier');
    await expect(checkout.delivery).toHaveText('150 UAH');
    await expect(checkout.total).toHaveText('5,650 UAH');
    await checkout.chooseDelivery('Pickup in store');
    await expect(checkout.delivery).toHaveText('Free');
    await expect(checkout.total).toHaveText('5,500 UAH');
  });

  test('removing the promo code removes the discount', async () => {
    await checkout.applyPromo('welcome5');
    await expect(checkout.discount).toHaveText('-275 UAH');
    await expect(checkout.total).toHaveText('5,295 UAH');
    await checkout.removePromo();
    await expect(checkout.discount).toHaveText('—');
    await expect(checkout.total).toHaveText('5,570 UAH');
  });
});
