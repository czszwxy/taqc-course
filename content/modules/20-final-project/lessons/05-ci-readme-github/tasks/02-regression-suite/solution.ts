import { test as base, expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';

type Delivery = 'Pickup in store' | 'Post office' | 'Courier';

interface Customer {
  name: string;
  phone: string;
  city: string;
  address: string;
}

const CUSTOMER: Customer = { name: 'Olena Tester', phone: '+380671234567', city: 'Kyiv', address: 'Post office 12' };

class CheckoutPage {
  readonly delivery: Locator;
  readonly total: Locator;
  readonly address: Locator;
  readonly placeOrderButton: Locator;
  readonly confirmation: Locator;

  constructor(readonly page: Page) {
    this.delivery = page.getByTestId('summary-delivery');
    this.total = page.getByTestId('summary-total');
    this.address = page.getByLabel('Address');
    this.placeOrderButton = page.getByRole('button', { name: 'Place order' });
    this.confirmation = page.getByTestId('confirmation');
  }

  async open(): Promise<void> {
    await this.page.goto('/playground/checkout');
    await expect(this.page.getByTestId('summary-subtotal')).toBeVisible();
  }

  async chooseDelivery(method: Delivery): Promise<void> {
    await this.page.getByRole('radio', { name: new RegExp(`^${method}`) }).check();
  }

  increaseButton(product: string): Locator {
    return this.page.getByRole('button', { name: `Increase ${product}` });
  }

  async fillContact(customer: Customer): Promise<void> {
    await this.page.getByLabel('Full name').fill(customer.name);
    await this.page.getByLabel('Phone', { exact: true }).fill(customer.phone);
    await this.page.getByLabel('City').selectOption(customer.city);
    await this.address.fill(customer.address);
  }
}

const test = base.extend<{ checkout: CheckoutPage }>({
  checkout: async ({ page }, use) => {
    const checkout = new CheckoutPage(page);
    await checkout.open();
    await use(checkout);
  },
});

const cart = (headphones: number, mouse: number, cables: number) => [
  { productId: 101, quantity: headphones },
  { productId: 103, quantity: mouse },
  { productId: 104, quantity: cables },
];

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

  test('changing the delivery method re-prices the order', async ({ checkout }) => {
    await checkout.chooseDelivery('Courier');
    await expect(checkout.delivery).toHaveText('150 UAH');
    await expect(checkout.total).toHaveText('5,650 UAH');
  });

  test('the address field is hidden for pickup', async ({ checkout }) => {
    await checkout.chooseDelivery('Pickup in store');
    await expect(checkout.address).toBeHidden();
  });
});

test.describe('Cart', () => {
  test('"+" is disabled at the maximum quantity of 5', async ({ checkout }) => {
    const plus = checkout.increaseButton('Wireless Mouse M2');
    for (let quantity = 1; quantity < 5; quantity++) {
      await plus.click();
    }
    await expect(checkout.page.getByTestId('qty-103')).toHaveText('5');
    await expect(plus).toBeDisabled();
  });
});

test.describe('Contact details and placing the order', () => {
  test('a phone with 8 digits is rejected next to the field', async ({ checkout }) => {
    await checkout.fillContact({ ...CUSTOMER, phone: '+38067123456' });
    await checkout.placeOrderButton.click();
    await expect(checkout.page.getByTestId('error-phone')).toHaveText('Phone must look like +380XXXXXXXXX');
  });

  test('a double click on Place order places only one order', async ({ checkout, page }) => {
    const orderRequests: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('/checkout/orders')) orderRequests.push(request.url());
    });
    await checkout.fillContact(CUSTOMER);
    await checkout.placeOrderButton.dblclick();
    await expect(checkout.confirmation).toBeVisible();
    expect(orderRequests).toHaveLength(1);
  });
});

test.describe('Pricing API', () => {
  test('courier is free from exactly 10,000 UAH', async ({ request }) => {
    const result = await quote(request, { items: cart(2, 1, 2), delivery: 'courier' });
    expect(result).toMatchObject({ subtotal: 10000, deliveryFee: 0 });
  });

  test('WELCOME5 takes 5 % of the subtotal only', async ({ request }) => {
    const result = await quote(request, { items: cart(1, 1, 2), delivery: 'courier', promoCode: 'WELCOME5' });
    expect(result).toMatchObject({ discount: 275, total: 5375 });
  });
});

test.describe('Saved orders', () => {
  test('a saved order has the same total as its quote', async ({ request }) => {
    const body = { items: cart(1, 1, 2), delivery: 'post', promoCode: 'WELCOME5' };
    const expected = await quote(request, body);
    const created = await request.post('/api/checkout/orders', { data: { ...body, customer: CUSTOMER } });
    expect(created.status()).toBe(201);
    const order = await created.json();
    await request.delete(`/api/checkout/orders/${order.id}`, { params: { phone: CUSTOMER.phone } });
    expect(order.total).toBe(expected.total);
  });
});
