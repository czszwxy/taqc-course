import { test as base, expect, type APIRequestContext, type APIResponse, type Locator, type Page } from '@playwright/test';

const USER = { email: 'qa@gadgetly.test', password: 'Test1234' };

interface Order {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  total: number;
  status: string;
}

/** API client for /api/orders. */
class OrdersApi {
  constructor(
    private readonly request: APIRequestContext,
    private readonly token: string,
  ) {}

  private get headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.token}` };
  }

  create(productId: number, quantity: number): Promise<APIResponse> {
    return this.request.post('/api/orders', { headers: this.headers, data: { productId, quantity } });
  }

  patch(id: number, quantity: number): Promise<APIResponse> {
    return this.request.patch(`/api/orders/${id}`, { headers: this.headers, data: { quantity } });
  }

  remove(id: number): Promise<APIResponse> {
    return this.request.delete(`/api/orders/${id}`, { headers: this.headers });
  }
}

/** Page Object for My account (opens it already signed in). */
class AccountPage {
  constructor(
    readonly page: Page,
    private readonly token: string,
  ) {}

  async open(): Promise<void> {
    await this.page.addInitScript((t) => localStorage.setItem('gadgetly:token', t), this.token);
    await this.page.goto('/playground/account');
    await expect(this.page.getByRole('heading', { name: 'My account' })).toBeVisible();
  }

  order(id: number): Locator {
    return this.page.getByTestId(`order-${id}`);
  }
}

type Fixtures = {
  token: string;
  ordersApi: OrdersApi;
  account: AccountPage;
  newOrder: Order;
};

const test = base.extend<Fixtures>({
  token: async ({ request }, use) => {
    const response = await request.post('/api/auth/login', { data: USER });
    await use((await response.json()).token);
  },
  ordersApi: async ({ request, token }, use) => {
    await use(new OrdersApi(request, token));
  },
  account: async ({ page, token }, use) => {
    await use(new AccountPage(page, token));
  },
  newOrder: async ({ ordersApi }, use) => {
    const response = await ordersApi.create(1, 2);
    expect(response.status()).toBe(201);
    const order: Order = await response.json();
    await use(order);
    await ordersApi.remove(order.id);
  },
});

test('a new order is shown in the account', async ({ newOrder, account }) => {
  await account.open();
  await expect(account.order(newOrder.id)).toContainText('2 pcs · created');
  await expect(account.order(newOrder.id)).toContainText('998 UAH');
});

test('a changed quantity is shown with the new total', async ({ newOrder, ordersApi, account }) => {
  const patched = await ordersApi.patch(newOrder.id, 3);
  expect(patched.status()).toBe(200);

  await account.open();
  await expect(account.order(newOrder.id)).toContainText('1,497 UAH');
});

test('an order can be deleted only once', async ({ newOrder, ordersApi }) => {
  expect((await ordersApi.remove(newOrder.id)).status()).toBe(204);
  expect((await ordersApi.remove(newOrder.id)).status()).toBe(404);
});

test('quantity 0 is rejected', async ({ ordersApi }) => {
  const response = await ordersApi.create(1, 0);
  try {
    expect(response.status()).toBe(400);
  } finally {
    if (response.ok()) await ordersApi.remove((await response.json()).id);
  }
});
