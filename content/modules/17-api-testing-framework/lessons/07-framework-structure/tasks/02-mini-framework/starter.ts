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
  // твій код тут: фікстура newOrder (створити → use → видалити)
});

test('a new order is shown in the account', async ({ ordersApi, account }) => {
  const order: Order = await (await ordersApi.create(1, 2)).json();

  await account.open();
  await expect(account.order(order.id)).toContainText('998 UAH');

  await ordersApi.remove(order.id);
});

// твій код тут: тести на newOrder — PATCH → 1,497 UAH, повторне видалення → 404, quantity 0 → 400
