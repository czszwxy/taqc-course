import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

async function apiToken(request: APIRequestContext): Promise<string> {
  const response = await request.post('/api/auth/login', { data: { email: 'qa@gadgetly.test', password: 'Test1234' } });
  return (await response.json()).token;
}

/** Opens My account already signed in — no login form. */
async function openAccount(page: Page, token: string): Promise<void> {
  await page.addInitScript((t) => localStorage.setItem('gadgetly:token', t), token);
  await page.goto('/playground/account');
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
}

test('an order created through the API is shown in the UI', async ({ page, request }) => {
  const token = await apiToken(request);
  const headers = { Authorization: `Bearer ${token}` };
  const order = await (await request.post('/api/orders', { headers, data: { productId: 1, quantity: 2 } })).json();

  try {
    await openAccount(page, token);
    const row = page.getByTestId(`order-${order.id}`);
    await expect(row).toContainText('2 pcs · created');
    await expect(row.getByTestId('order-total')).toContainText('998 UAH');
  } finally {
    await request.delete(`/api/orders/${order.id}`, { headers });
  }
});

test('a quantity changed through the API is shown in the UI', async ({ page, request }) => {
  const token = await apiToken(request);
  const headers = { Authorization: `Bearer ${token}` };
  const order = await (await request.post('/api/orders', { headers, data: { productId: 1, quantity: 2 } })).json();

  try {
    const patched = await request.patch(`/api/orders/${order.id}`, { headers, data: { quantity: 3 } });
    expect(patched.status()).toBe(200);

    await openAccount(page, token);
    const row = page.getByTestId(`order-${order.id}`);
    await expect(row).toContainText('3 pcs');
    await expect(row.getByTestId('order-total')).toContainText('1,497 UAH');
  } finally {
    await request.delete(`/api/orders/${order.id}`, { headers });
  }
});

test('an order deleted through the API disappears from the UI', async ({ page, request }) => {
  const token = await apiToken(request);
  const headers = { Authorization: `Bearer ${token}` };
  const order = await (await request.post('/api/orders', { headers, data: { productId: 1, quantity: 1 } })).json();

  try {
    await openAccount(page, token);
    const row = page.getByTestId(`order-${order.id}`);
    await expect(row).toBeVisible();

    expect((await request.delete(`/api/orders/${order.id}`, { headers })).status()).toBe(204);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'My orders' })).toBeVisible();
    await expect(row).toHaveCount(0);
  } finally {
    await request.delete(`/api/orders/${order.id}`, { headers });
  }
});
