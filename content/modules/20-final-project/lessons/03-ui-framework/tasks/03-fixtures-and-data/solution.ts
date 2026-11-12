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
  readonly orderNumber: Locator;
  readonly confirmationTotal: Locator;
  readonly phoneError: Locator;

  constructor(readonly page: Page) {
    this.total = page.getByTestId('summary-total');
    this.placeOrderButton = page.getByRole('button', { name: 'Place order' });
    this.confirmation = page.getByTestId('confirmation');
    this.orderNumber = page.getByTestId('order-number');
    this.confirmationTotal = page.getByTestId('confirmation-total');
    this.phoneError = page.getByTestId('error-phone');
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

test('a valid order shows its number and the same total as the summary', async ({ checkout, customer }) => {
  await expect(checkout.total).toHaveText('5,570 UAH');
  await checkout.fillContact(customer);
  await checkout.placeOrderButton.click();
  await expect(checkout.confirmation).toBeVisible();
  await expect(checkout.orderNumber).toHaveText(/^#\d+$/);
  await expect(checkout.confirmationTotal).toHaveText('5,570 UAH');
});

test('a phone with 8 digits is rejected next to the field', async ({ checkout, customer }) => {
  await checkout.fillContact({ ...customer, phone: '+38067123456' });
  await checkout.placeOrderButton.click();
  await expect(checkout.phoneError).toHaveText('Phone must look like +380XXXXXXXXX');
  await expect(checkout.confirmation).toBeHidden();
});

test('a double click on Place order places only one order', async ({ checkout, customer, page }) => {
  const orderRequests: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/checkout/orders')) orderRequests.push(request.url());
  });
  await checkout.fillContact(customer);
  await checkout.placeOrderButton.dblclick();
  await expect(checkout.confirmation).toBeVisible();
  expect(orderRequests).toHaveLength(1);
});
