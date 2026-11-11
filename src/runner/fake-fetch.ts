import productsData from '../playground/data/products.json';
import data from './fake-api-data.json';

/**
 * Offline fake of `fetch` for code tasks (modules 13+). It answers like the Gadgetly API at
 * https://api.gadgetly.test, fully in memory and deterministically, so tests never depend on a network.
 * Pure: used by the exec worker (browser) and by scripts/validate-content.ts (Node).
 *
 *   GET  /api/health                     → { status: 'ok' }
 *   GET  /api/products?category=&inStock= → { items, total }
 *   GET  /api/products/:id               → product | 400 | 404
 *   GET  /api/users/:id                  → user (no password) | 404
 *   POST /api/auth/login {email,password} → { token, user } | 400 | 401
 *   GET  /api/orders        (Bearer)     → { items } | 401
 *   POST /api/orders        (Bearer)     → 201 order + Location | 400 | 401 | 404
 *   GET  /api/broken                     → 500
 *   GET  /api/slow?ms=                   → waits, then { waitedMs }
 *   any other host                       → rejects with TypeError('Failed to fetch')
 */

const STATUS = data.status;

const STATUS_TEXT: Record<string, string> = {
  [STATUS.ok]: 'OK',
  [STATUS.created]: 'Created',
  [STATUS.badRequest]: 'Bad Request',
  [STATUS.unauthorized]: 'Unauthorized',
  [STATUS.notFound]: 'Not Found',
  [STATUS.serverError]: 'Internal Server Error',
};

/** 2xx range: ok = status >= OK_MIN && status < OK_LIMIT. */
const OK_MIN = STATUS.ok;
const OK_LIMIT = data.okLimit;

export interface FakeResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly url: string;
  readonly headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export interface FakeRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

interface Order {
  id: number;
  userId: number;
  productId: number;
  quantity: number;
  status: string;
  total: number;
}

const PRODUCTS = productsData.map((p, i) => ({ id: i + 1, name: p.name, category: p.category, price: p.price, inStock: p.inStock }));

const priceOf = (productId: number): number => PRODUCTS.find((p) => p.id === productId)?.price ?? 0;

function makeResponse(url: string, status: number, body: unknown, extraHeaders: Record<string, string> = {}): FakeResponse {
  const text = body === undefined ? '' : JSON.stringify(body);
  const headers: Record<string, string> = { 'content-type': 'application/json', ...extraHeaders };
  return {
    ok: status >= OK_MIN && status < OK_LIMIT,
    status,
    statusText: STATUS_TEXT[status] ?? '',
    url,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: async () => JSON.parse(text) as unknown,
    text: async () => text,
  };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function parseBody(body: string | undefined): unknown {
  if (!body) return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

function headerValue(headers: Record<string, string> | undefined, name: string): string {
  const entry = Object.entries(headers ?? {}).find(([k]) => k.toLowerCase() === name);
  return entry?.[1] ?? '';
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Reply = { status: number; body?: unknown; headers?: Record<string, string> };

/** Creates a fresh fake API (its own orders) for one test run. */
export function createFakeFetch(): (input: string, init?: FakeRequestInit) => Promise<FakeResponse> {
  let orders: Order[] = data.orders.map((o) => ({ ...o, total: priceOf(o.productId) * o.quantity }));
  let nextOrderId = data.nextOrderId;

  const userByToken = (init?: FakeRequestInit) =>
    headerValue(init?.headers, 'authorization') === `Bearer ${data.token}` ? data.users.find((u) => u.id === data.users[0]?.id) : undefined;

  const publicUser = (u: (typeof data.users)[number]) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

  const createOrder = (body: unknown, userId: number): Reply => {
    if (!isObject(body) || !Number.isInteger(body.productId) || !Number.isInteger(body.quantity)) {
      return { status: STATUS.badRequest, body: { error: 'productId and quantity must be integers' } };
    }
    const quantity = body.quantity as number;
    if (quantity < data.minQuantity || quantity > data.maxQuantity) {
      return { status: STATUS.badRequest, body: { error: `quantity must be from ${data.minQuantity} to ${data.maxQuantity}` } };
    }
    const productId = body.productId as number;
    if (!PRODUCTS.some((p) => p.id === productId)) return { status: STATUS.notFound, body: { error: 'Product not found' } };
    const order: Order = { id: nextOrderId, userId, productId, quantity, status: 'created', total: priceOf(productId) * quantity };
    nextOrderId += 1;
    orders = [...orders, order];
    return { status: STATUS.created, body: order, headers: { location: `/api/orders/${order.id}` } };
  };

  const route = async (method: string, url: URL, init?: FakeRequestInit): Promise<Reply> => {
    const parts = url.pathname.split('/').filter(Boolean);
    const [api, resource, id] = parts;
    if (api !== 'api') return { status: STATUS.notFound, body: { error: 'Route not found' } };

    if (method === 'GET' && resource === 'health') return { status: STATUS.ok, body: { status: 'ok' } };
    if (method === 'GET' && resource === 'broken') return { status: STATUS.serverError, body: { error: 'Internal Server Error' } };
    if (method === 'GET' && resource === 'slow') {
      const ms = Math.min(Math.max(Number(url.searchParams.get('ms')) || 0, 0), data.maxSlowMs);
      await wait(ms);
      return { status: STATUS.ok, body: { waitedMs: ms } };
    }

    if (method === 'GET' && resource === 'products' && id === undefined) {
      const category = url.searchParams.get('category');
      const inStock = url.searchParams.get('inStock');
      const items = PRODUCTS.filter((p) => (!category || p.category === category) && (inStock === null || String(p.inStock) === inStock));
      return { status: STATUS.ok, body: { items, total: items.length } };
    }
    if (method === 'GET' && resource === 'products') {
      if (!Number.isInteger(Number(id))) return { status: STATUS.badRequest, body: { error: 'Product id must be a number' } };
      const product = PRODUCTS.find((p) => p.id === Number(id));
      return product ? { status: STATUS.ok, body: product } : { status: STATUS.notFound, body: { error: 'Product not found' } };
    }

    if (method === 'GET' && resource === 'users' && id !== undefined) {
      const user = data.users.find((u) => u.id === Number(id));
      return user ? { status: STATUS.ok, body: publicUser(user) } : { status: STATUS.notFound, body: { error: 'User not found' } };
    }

    if (method === 'POST' && resource === 'auth' && id === 'login') {
      const body = parseBody(init?.body);
      if (!isObject(body) || typeof body.email !== 'string' || typeof body.password !== 'string') {
        return { status: STATUS.badRequest, body: { error: 'email and password are required' } };
      }
      const user = data.users.find((u) => u.email === body.email && u.password === body.password);
      return user && user.id === data.users[0]?.id
        ? { status: STATUS.ok, body: { token: data.token, user: publicUser(user) } }
        : { status: STATUS.unauthorized, body: { error: 'Invalid email or password' } };
    }

    if (resource === 'orders' && id === undefined && (method === 'GET' || method === 'POST')) {
      const user = userByToken(init);
      if (!user) return { status: STATUS.unauthorized, body: { error: 'Authorization header is missing or invalid' } };
      return method === 'GET'
        ? { status: STATUS.ok, body: { items: orders.filter((o) => o.userId === user.id) } }
        : createOrder(parseBody(init?.body), user.id);
    }

    return { status: STATUS.notFound, body: { error: 'Route not found' } };
  };

  return async (input: string, init?: FakeRequestInit): Promise<FakeResponse> => {
    await Promise.resolve();
    const url = new URL(input, data.baseUrl);
    if (url.origin !== data.baseUrl) throw new TypeError('Failed to fetch');
    const reply = await route((init?.method ?? 'GET').toUpperCase(), url, init);
    return makeResponse(url.toString(), reply.status, reply.body, reply.headers);
  };
}
