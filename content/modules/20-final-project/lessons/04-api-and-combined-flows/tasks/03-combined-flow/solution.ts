import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const PHONE = '+380671234567';
const ORDER = {
  items: [
    { productId: 101, quantity: 1 },
    { productId: 103, quantity: 1 },
    { productId: 104, quantity: 2 },
  ],
  delivery: 'post',
  promoCode: 'WELCOME5',
  customer: { name: 'Olena Tester', phone: PHONE, city: 'Kyiv', address: 'Post office 12' },
};

async function createOrder(request: APIRequestContext): Promise<number> {
  const response = await request.post('/api/checkout/orders', { data: ORDER });
  expect(response.status()).toBe(201);
  return (await response.json()).id;
}

async function deleteOrder(request: APIRequestContext, id: number, phone = PHONE): Promise<void> {
  const response = await request.delete(`/api/checkout/orders/${id}`, { params: { phone } });
  expect(response.status()).toBe(204);
}

async function track(page: Page, id: number, phone: string): Promise<void> {
  await page.goto('/playground/checkout');
  await page.getByLabel('Order number').fill(String(id));
  await page.getByLabel('Phone used at checkout').fill(phone);
  await page.getByRole('button', { name: 'Track' }).click();
}

test.describe('Order tracking', () => {
  let orderId: number;

  test.beforeEach(async ({ request }) => {
    orderId = await createOrder(request);
  });

  test.afterEach(async ({ request }) => {
    await deleteOrder(request, orderId);
  });

  test('the created order can be read back with its phone', async ({ request }) => {
    const response = await request.get(`/api/checkout/orders/${orderId}`, { params: { phone: PHONE } });
    expect(response.status()).toBe(200);
  });

  test('the saved order keeps the promo discount', async ({ request }) => {
    const response = await request.get(`/api/checkout/orders/${orderId}`, { params: { phone: PHONE } });
    expect(await response.json()).toMatchObject({ subtotal: 5500, discount: 275, deliveryFee: 70, total: 5295 });
  });

  test('tracking shows the order for the checkout phone', async ({ page }) => {
    await track(page, orderId, PHONE);
    await expect(page.getByTestId('track-result')).toContainText(`#${orderId}`);
    await expect(page.getByTestId('track-result')).toContainText('5,295 UAH');
  });

  test('tracking with another phone shows "Order not found"', async ({ page }) => {
    await track(page, orderId, '+380500000000');
    await expect(page.getByTestId('track-error')).toHaveText('Order not found. Check the number and the phone.');
    await expect(page.getByTestId('track-result')).toBeHidden();
  });
});

test('an order placed in the UI is saved with the same total', async ({ page, request }) => {
  await page.goto('/playground/checkout');
  await page.getByLabel('Promo code').fill('WELCOME5');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByTestId('summary-total')).toHaveText('5,295 UAH');
  await page.getByLabel('Full name').fill('Olena Tester');
  await page.getByLabel('Phone', { exact: true }).fill(PHONE);
  await page.getByLabel('Address').fill('Post office 12');
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page.getByTestId('confirmation-total')).toHaveText('5,295 UAH');

  const id = Number((await page.getByTestId('order-number').textContent())?.slice(1));
  const saved = await request.get(`/api/checkout/orders/${id}`, { params: { phone: PHONE } });
  expect((await saved.json()).total).toBe(5295);
  await deleteOrder(request, id);
});
