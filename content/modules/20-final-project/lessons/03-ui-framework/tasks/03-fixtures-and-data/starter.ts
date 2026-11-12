import { test as base, expect, type Locator, type Page } from '@playwright/test';

interface Customer {
  name: string;
  phone: string;
  city: string;
  address: string;
}

class CheckoutPage {
  readonly total: Locator;
  readonly placeOrderButton: Locator;
  readonly confirmation: Locator;

  constructor(readonly page: Page) {
    this.total = page.getByTestId('summary-total');
    this.placeOrderButton = page.getByRole('button', { name: 'Place order' });
    this.confirmation = page.getByTestId('confirmation');
  }

  async open(): Promise<void> {
    await this.page.goto('/playground/checkout');
    await expect(this.page.getByTestId('summary-subtotal')).toBeVisible();
  }

  async fillContact(customer: Customer): Promise<void> {
    await this.page.getByLabel('Full name').fill(customer.name);
    await this.page.getByLabel('Phone', { exact: true }).fill(customer.phone);
    await this.page.getByLabel('City').selectOption(customer.city);
    await this.page.getByLabel('Address').fill(customer.address);
  }
}

type Fixtures = { checkout: CheckoutPage; customer: Customer };

const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  customer: async ({}, use) => {
    await use({ name: 'Olena Tester', phone: '+380671234567', city: 'Lviv', address: 'Post office 12' });
  },
  checkout: async ({ page }, use) => {
    const checkout = new CheckoutPage(page);
    await checkout.open();
    await use(checkout);
  },
});

test('the default total is 5,570 UAH', async ({ checkout }) => {
  await expect(checkout.total).toHaveText('5,570 UAH');
});

// твій код тут
