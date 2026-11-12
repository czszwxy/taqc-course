import { test as base, expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';

type Delivery = 'Pickup in store' | 'Post office' | 'Courier';

class CheckoutPage {
  readonly delivery: Locator;
  readonly total: Locator;

  constructor(readonly page: Page) {
    this.delivery = page.getByTestId('summary-delivery');
    this.total = page.getByTestId('summary-total');
  }

  async open(): Promise<void> {
    await this.page.goto('/playground/checkout');
    await expect(this.page.getByTestId('summary-subtotal')).toBeVisible();
  }

  async chooseDelivery(method: Delivery): Promise<void> {
    await this.page.getByRole('radio', { name: new RegExp(`^${method}`) }).check();
  }

  // твій код тут
}

const test = base.extend<{ checkout: CheckoutPage }>({
  checkout: async ({ page }, use) => {
    const checkout = new CheckoutPage(page);
    await checkout.open();
    await use(checkout);
  },
});

async function quote(request: APIRequestContext, data: object) {
  const response = await request.post('/api/checkout/quote', { data });
  expect(response.status()).toBe(200);
  return response.json();
}

test.describe('Delivery', () => {
  test('post office costs 70 UAH by default', async ({ checkout }) => {
    await expect(checkout.delivery).toHaveText('70 UAH');
    await expect(checkout.total).toHaveText('5,570 UAH');
  });
});

// твій код тут: Cart, Contact details, Place order, Pricing API, Saved orders (+ request.delete cleanup)
