import type { IncomingMessage, ServerResponse } from 'node:http';
import { applyLabBugs, labBugsFromUserAgent } from './lab-types';
import {
  CHECKOUT_PROCESSING_MS,
  CHECKOUT_PRODUCTS,
  FIRST_CHECKOUT_ORDER_ID,
  findCheckoutOrder,
  placeCheckoutOrder,
  quoteCheckout,
  type CheckoutOrder,
  type Outcome,
} from './checkout-api';
import productsData from '../src/playground/data/products.json';
import data from './mock-data.json';

/**
 * Gadgetly mock REST API for the HTTP/API modules — runs inside the Vite dev/preview server.
 *
 *   /api/...        "release" build with INTENTIONAL bugs (catalogued in
 *                   content/modules/08-http-apis-json/lessons/08-api-test-design/tasks/03-bug-hunt/task.json)
 *   /api-fixed/...  the same API without bugs (for future "fails on buggy / passes on fixed" grading)
 *
 * Each base has its own in-memory store; POST /reset restores the seed data.
 * Handlers never mutate the store: they return a new store next to the reply.
 * Keep the bug flags below and the bug catalog in sync.
 */

export const API_BASE = '/api';
export const API_FIXED_BASE = '/api-fixed';

/** HTTP status codes used by the API (values live in mock-data.json). */
const STATUS = data.status;
const LIMITS = data.limits;

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  rating: number;
  inStock: boolean;
}

interface User {
  id: number;
  email: string;
  password: string;
  name: string;
  role: string;
}

interface Order {
  id: number;
  userId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  total: number;
  status: string;
  createdAt: string;
}

interface Store {
  orders: Order[];
  nextOrderId: number;
  /** Module 20 checkout orders (server/checkout-api.ts). */
  checkoutOrders: CheckoutOrder[];
  nextCheckoutId: number;
}

function getBugs(fixed: boolean) {
  const on = !fixed;
  return {
    paginationOverlap: on, // page 2+ starts with the last item of the previous page
    loginMissingPassword: on, // login without "password" → 500 instead of 400
    quantityZero: on, // POST /orders accepts quantity 0
    otherUsersOrder: on, // GET /orders/:id returns another user's order (should be 403)
    patchTotal: on, // PATCH quantity does not recalculate total
    deleteMissing: on, // DELETE of a non-existent order returns 204 instead of 404
    // Checkout API (module 20) — listed in the `checkout` page's bugIds in registry.ts:
    courierBoundary: on, // courier is free only above 10,000 UAH instead of from 10,000
    welcomeOnTotal: on, // WELCOME5 takes 5 % of subtotal + delivery instead of subtotal only
    maxQtyIgnored: on, // quote/orders accept quantity 6–10 (max is 5)
    orderIgnoresPromo: on, // POST /checkout/orders drops the promo discount from the order total
    trackingIgnoresPhone: on, // GET /checkout/orders/:id returns the order with any phone (should be 404)
  };
}
type Bugs = ReturnType<typeof getBugs>;

const PRODUCTS: Product[] = productsData.map((p, i) => ({
  id: i + 1,
  name: p.name,
  category: p.category,
  price: p.price,
  rating: p.rating,
  inStock: p.inStock,
}));

const USERS: User[] = data.users;

const b64url = (text: string): string => Buffer.from(text).toString('base64url');

function makeToken(user: User): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({ sub: user.id, email: user.email, name: user.name, role: user.role, iat: data.token.iat, exp: data.token.exp }),
  );
  return `${header}.${payload}.${b64url(data.token.signature)}`;
}

const TOKENS = new Map(USERS.map((u) => [makeToken(u), u]));

function priceOf(productId: number): number {
  return PRODUCTS.find((p) => p.id === productId)?.price ?? 0;
}

function seedStore(): Store {
  const orders = data.orders.map((o) => ({ ...o, unitPrice: priceOf(o.productId), total: priceOf(o.productId) * o.quantity }));
  return { orders, nextOrderId: data.nextOrderId, checkoutOrders: [], nextCheckoutId: FIRST_CHECKOUT_ORDER_ID };
}

const stores: Record<string, Store> = { [API_BASE]: seedStore(), [API_FIXED_BASE]: seedStore() };

let requestCounter = 0;
function nextRequestId(): string {
  requestCounter += 1;
  return `req-${requestCounter.toString().padStart(LIMITS.requestIdDigits, '0')}`;
}

/* ---------- request / response helpers ---------- */

interface Reply {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
  /** New store state when the request changed data. */
  store?: Store;
}

const reply = (status: number, body?: unknown, headers?: Record<string, string>): Reply => ({ status, body, headers });
const error = (status: number, message: string, headers?: Record<string, string>): Reply => reply(status, { error: message }, headers);

function send(res: ServerResponse, r: Reply): void {
  const headers: Record<string, string> = { 'X-Request-Id': nextRequestId(), ...r.headers };
  if (r.body === undefined) {
    res.writeHead(r.status, headers).end();
    return;
  }
  res.writeHead(r.status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(r.body, null, LIMITS.jsonIndent));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

type Parsed = { ok: true; body: unknown } | { ok: false; reply: Reply };

function parseBody(raw: string, contentType: string | undefined): Parsed {
  if (raw.trim() === '') return { ok: true, body: undefined };
  if (Buffer.byteLength(raw) > LIMITS.maxBodyBytes) return { ok: false, reply: error(STATUS.payloadTooLarge, 'Body is too large') };
  if (!(contentType ?? '').toLowerCase().includes('application/json')) {
    return { ok: false, reply: error(STATUS.unsupportedMediaType, 'Content-Type must be application/json') };
  }
  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, reply: error(STATUS.badRequest, 'Body must be valid JSON') };
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

/* ---------- routing ---------- */

interface Ctx {
  base: string;
  store: Store;
  bug: Bugs;
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
  user: User | null;
}

interface Route {
  method: string;
  path: string;
  auth?: boolean;
  handle: (ctx: Ctx) => Reply | Promise<Reply>;
}

function matchPath(pattern: string, path: string): Record<string, string> | null {
  const want = pattern.split('/').filter(Boolean);
  const got = path.split('/').filter(Boolean);
  if (want.length !== got.length) return null;
  const pairs = want.map((seg, i) => ({ seg, value: got[i] ?? '' }));
  if (!pairs.every(({ seg, value }) => seg.startsWith(':') || seg === value)) return null;
  return Object.fromEntries(pairs.filter(({ seg }) => seg.startsWith(':')).map(({ seg, value }) => [seg.slice(1), decodeURIComponent(value)]));
}

function authenticate(header: string | undefined): { user: User | null; problem: string | null } {
  if (!header) return { user: null, problem: 'Authorization header is missing' };
  const [scheme, token] = header.trim().split(' ');
  if ((scheme ?? '').toLowerCase() !== 'bearer' || !token) return { user: null, problem: 'Use the format: Authorization: Bearer <token>' };
  const user = TOKENS.get(token);
  return user ? { user, problem: null } : { user: null, problem: 'Invalid token' };
}

/* ---------- handlers ---------- */

function parsePositive(value: string | null, fallback: number): number | null {
  if (value === null) return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

function listProducts({ query, bug }: Ctx): Reply {
  const page = parsePositive(query.get('page'), LIMITS.defaultPage);
  const limit = parsePositive(query.get('limit'), LIMITS.defaultLimit);
  if (page === null || limit === null) return error(STATUS.badRequest, 'page and limit must be positive integers');
  if (limit > LIMITS.maxLimit) return error(STATUS.badRequest, `limit must not be greater than ${LIMITS.maxLimit}`);

  const category = query.get('category');
  const inStock = query.get('inStock');
  const min = query.get('minPrice');
  const max = query.get('maxPrice');
  const filtered = PRODUCTS.filter(
    (p) =>
      (!category || p.category.toLowerCase() === category.toLowerCase()) &&
      (inStock === null || String(p.inStock) === inStock) &&
      (min === null || p.price >= Number(min)) &&
      (max === null || p.price <= Number(max)),
  );
  const shift = bug.paginationOverlap && page > LIMITS.defaultPage ? 1 : 0;
  const offset = (page - 1) * limit - shift;
  return reply(STATUS.ok, { items: filtered.slice(offset, offset + limit), page, limit, total: filtered.length });
}

function getProduct({ params }: Ctx): Reply {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return error(STATUS.badRequest, 'Product id must be a number');
  const product = PRODUCTS.find((p) => p.id === id);
  return product ? reply(STATUS.ok, product) : error(STATUS.notFound, 'Product not found');
}

function publicUser(u: User) {
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

function login({ body, bug }: Ctx): Reply {
  if (!isObject(body)) return error(STATUS.badRequest, 'Body must be a JSON object with email and password');
  if (bug.loginMissingPassword && body.password === undefined) return error(STATUS.serverError, 'Internal Server Error');
  if (typeof body.email !== 'string' || typeof body.password !== 'string') return error(STATUS.badRequest, 'email and password are required');
  const email = body.email.trim().toLowerCase();
  const user = USERS.find((u) => u.email === email && u.password === body.password);
  if (!user) return error(STATUS.unauthorized, 'Invalid email or password');
  return reply(STATUS.ok, { token: makeToken(user), tokenType: 'Bearer', expiresIn: data.token.exp - data.token.iat, user: publicUser(user) });
}

type OrderInput = { ok: true; productId: number; quantity: number } | { ok: false; reply: Reply };

function validateOrderInput(body: unknown, minQuantity: number): OrderInput {
  const bad = (message: string): OrderInput => ({ ok: false, reply: error(STATUS.badRequest, message) });
  if (!isObject(body)) return bad('Body must be a JSON object with productId and quantity');
  if (body.productId === undefined) return bad('productId is required');
  if (!isInt(body.productId)) return bad('productId must be an integer');
  if (body.quantity === undefined) return bad('quantity is required');
  if (!isInt(body.quantity)) return bad('quantity must be an integer');
  if (body.quantity < minQuantity || body.quantity > LIMITS.maxQuantity) return bad(`quantity must be from ${LIMITS.minQuantity} to ${LIMITS.maxQuantity}`);
  return { ok: true, productId: body.productId, quantity: body.quantity };
}

function productProblem(productId: number): Reply | null {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return error(STATUS.unprocessable, `Product ${productId} does not exist`);
  return product.inStock ? null : error(STATUS.conflict, 'Product is out of stock');
}

function withOrder(store: Store, order: Order): Store {
  return { ...store, orders: store.orders.map((o) => (o.id === order.id ? order : o)) };
}

function createOrder({ base, body, store, bug, user }: Ctx): Reply {
  const input = validateOrderInput(body, bug.quantityZero ? 0 : LIMITS.minQuantity);
  if (!input.ok) return input.reply;
  const problem = productProblem(input.productId);
  if (problem) return problem;
  const unitPrice = priceOf(input.productId);
  const order: Order = {
    id: store.nextOrderId,
    userId: user?.id ?? 0,
    productId: input.productId,
    quantity: input.quantity,
    unitPrice,
    total: unitPrice * input.quantity,
    status: 'created',
    createdAt: new Date().toISOString(),
  };
  const next: Store = { ...store, orders: [...store.orders, order], nextOrderId: store.nextOrderId + 1 };
  return { ...reply(STATUS.created, order, { Location: `${base}/orders/${order.id}` }), store: next };
}

type Found = { ok: true; order: Order } | { ok: false; reply: Reply };

function findOrder({ params, store, user }: Ctx, allowOthers: boolean): Found {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return { ok: false, reply: error(STATUS.badRequest, 'Order id must be a number') };
  const order = store.orders.find((o) => o.id === id);
  if (!order) return { ok: false, reply: error(STATUS.notFound, 'Order not found') };
  if (order.userId !== user?.id && !allowOthers) return { ok: false, reply: error(STATUS.forbidden, "You don't have access to this order") };
  return { ok: true, order };
}

function getOrder(ctx: Ctx): Reply {
  const found = findOrder(ctx, ctx.bug.otherUsersOrder);
  return found.ok ? reply(STATUS.ok, found.order) : found.reply;
}

function replaceOrder(ctx: Ctx): Reply {
  const found = findOrder(ctx, false);
  if (!found.ok) return found.reply;
  const input = validateOrderInput(ctx.body, LIMITS.minQuantity);
  if (!input.ok) return input.reply;
  const problem = productProblem(input.productId);
  if (problem) return problem;
  const unitPrice = priceOf(input.productId);
  const updated: Order = { ...found.order, productId: input.productId, quantity: input.quantity, unitPrice, total: unitPrice * input.quantity };
  return { ...reply(STATUS.ok, updated), store: withOrder(ctx.store, updated) };
}

function patchOrder(ctx: Ctx): Reply {
  const found = findOrder(ctx, false);
  if (!found.ok) return found.reply;
  const { body } = ctx;
  if (!isObject(body) || body.quantity === undefined) return error(STATUS.badRequest, 'Send {"quantity": <1–10>} — only quantity can be changed');
  if (!isInt(body.quantity) || body.quantity < LIMITS.minQuantity || body.quantity > LIMITS.maxQuantity) {
    return error(STATUS.badRequest, `quantity must be an integer from ${LIMITS.minQuantity} to ${LIMITS.maxQuantity}`);
  }
  const total = ctx.bug.patchTotal ? found.order.total : found.order.unitPrice * body.quantity;
  const updated: Order = { ...found.order, quantity: body.quantity, total };
  return { ...reply(STATUS.ok, updated), store: withOrder(ctx.store, updated) };
}

function deleteOrder(ctx: Ctx): Reply {
  const found = findOrder(ctx, false);
  const missing = !found.ok && found.reply.status === STATUS.notFound;
  if (missing && ctx.bug.deleteMissing) return reply(STATUS.noContent);
  if (!found.ok) return found.reply;
  return { ...reply(STATUS.noContent), store: { ...ctx.store, orders: ctx.store.orders.filter((o) => o.id !== found.order.id) } };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function slow({ query }: Ctx): Promise<Reply> {
  const ms = Math.min(Math.max(Number(query.get('ms')) || 0, 0), LIMITS.maxDelayMs);
  await wait(ms);
  return reply(STATUS.ok, { waitedMs: ms });
}

/* ---------- checkout (module 20): logic in checkout-api.ts ---------- */

const fromOutcome = (o: Outcome): Reply => reply(o.status, o.body, o.headers);

async function placeCheckout({ base, body, bug }: Ctx): Promise<Reply> {
  // "Payment processing": a short delay makes a double click on "Place order" observable.
  await wait(CHECKOUT_PROCESSING_MS);
  // Read the store after the delay so parallel requests get different ids.
  const store = stores[base] ?? seedStore();
  const result = placeCheckoutOrder(base, body, bug, store.nextCheckoutId, new Date());
  if (!result.order) return fromOutcome(result.outcome);
  const next: Store = { ...store, checkoutOrders: [...store.checkoutOrders, result.order], nextCheckoutId: store.nextCheckoutId + 1 };
  return { ...fromOutcome(result.outcome), store: next };
}

function trackCheckout({ store, params, query, bug }: Ctx): Reply {
  const found = findCheckoutOrder(store.checkoutOrders, params.id ?? '', query.get('phone'), bug.trackingIgnoresPhone);
  return found.ok ? reply(STATUS.ok, found.value) : fromOutcome(found.outcome);
}

function cancelCheckout({ store, params, query }: Ctx): Reply {
  const found = findCheckoutOrder(store.checkoutOrders, params.id ?? '', query.get('phone'), false);
  if (!found.ok) return fromOutcome(found.outcome);
  return { ...reply(STATUS.noContent), store: { ...store, checkoutOrders: store.checkoutOrders.filter((o) => o.id !== found.value.id) } };
}

const ROUTES: Route[] = [
  { method: 'GET', path: '/health', handle: () => reply(STATUS.ok, { status: 'ok', version: data.version }) },
  { method: 'GET', path: '/products', handle: listProducts },
  { method: 'GET', path: '/products/:id', handle: getProduct },
  { method: 'POST', path: '/auth/login', handle: login },
  { method: 'GET', path: '/me', auth: true, handle: ({ user }) => reply(STATUS.ok, user ? publicUser(user) : {}) },
  { method: 'GET', path: '/orders', auth: true, handle: ({ store, user }) => reply(STATUS.ok, { items: store.orders.filter((o) => o.userId === user?.id) }) },
  { method: 'POST', path: '/orders', auth: true, handle: createOrder },
  { method: 'GET', path: '/orders/:id', auth: true, handle: getOrder },
  { method: 'PUT', path: '/orders/:id', auth: true, handle: replaceOrder },
  { method: 'PATCH', path: '/orders/:id', auth: true, handle: patchOrder },
  { method: 'DELETE', path: '/orders/:id', auth: true, handle: deleteOrder },
  { method: 'GET', path: '/slow', handle: slow },
  { method: 'POST', path: '/lab/profile', handle: ({ body }) => reply(STATUS.created, { saved: true, profile: body }, { 'X-Request-Id': data.lab.requestId }) },
  { method: 'GET', path: '/lab/avatar.png', handle: () => error(STATUS.notFound, 'File not found') },
  { method: 'GET', path: '/lab/orders', handle: ({ query }) => reply(STATUS.ok, { filter: Object.fromEntries(query.entries()), items: [] }) },
  { method: 'GET', path: '/checkout/products', handle: () => reply(STATUS.ok, { items: CHECKOUT_PRODUCTS }) },
  { method: 'POST', path: '/checkout/quote', handle: ({ body, bug }) => fromOutcome(quoteCheckout(body, bug)) },
  { method: 'POST', path: '/checkout/orders', handle: placeCheckout },
  { method: 'GET', path: '/checkout/orders/:id', handle: trackCheckout },
  { method: 'DELETE', path: '/checkout/orders/:id', handle: cancelCheckout },
];

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

async function handle(base: string, req: IncomingMessage): Promise<Reply> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const method = (req.method ?? 'GET').toUpperCase();
  const store = stores[base] ?? seedStore();
  // Graded Playwright runs mark their requests (user agent) with the one bug to turn on — see server/lab-types.ts.
  const bug = applyLabBugs(getBugs(base === API_FIXED_BASE), labBugsFromUserAgent(req.headers['user-agent']));

  if (method === 'POST' && url.pathname === '/reset') {
    const fresh = seedStore();
    return { ...reply(STATUS.ok, { status: 'reset', orders: fresh.orders.length }), store: fresh };
  }

  const candidates = ROUTES.map((r) => ({ r, params: matchPath(r.path, url.pathname) })).filter((c) => c.params !== null);
  if (candidates.length === 0) return error(STATUS.notFound, `Route ${method} ${url.pathname} not found`);
  const match = candidates.find((c) => c.r.method === method);
  if (!match) {
    const allow = candidates.map((c) => c.r.method).join(', ');
    return error(STATUS.methodNotAllowed, `Method ${method} is not allowed here. Allowed: ${allow}`, { Allow: allow });
  }

  const auth = match.r.auth ? authenticate(req.headers.authorization) : { user: null, problem: null };
  if (auth.problem) return error(STATUS.unauthorized, auth.problem, { 'WWW-Authenticate': 'Bearer' });

  const raw = METHODS_WITH_BODY.has(method) ? await readBody(req) : '';
  const parsed = parseBody(raw, req.headers['content-type']);
  if (!parsed.ok) return parsed.reply;

  return match.r.handle({ base, store, bug, params: match.params ?? {}, query: url.searchParams, body: parsed.body, user: auth.user });
}

async function respond(base: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const result = await handle(base, req);
    if (result.store) stores[base] = result.store;
    send(res, result);
  } catch {
    send(res, error(STATUS.serverError, 'Internal Server Error'));
  }
}

type Next = (err?: unknown) => void;

/** Connect-style middleware for one base path (Vite strips the mount path from req.url). */
export function mockApiMiddleware(base: string) {
  return (req: IncomingMessage, res: ServerResponse, _next: Next): void => {
    void respond(base, req, res);
  };
}
