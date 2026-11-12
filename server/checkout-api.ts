import checkout from '../src/playground/data/checkout.json';
import data from './mock-data.json';

/**
 * Gadgetly Checkout API (module 20 "Final Portfolio Project") — pure handlers wired into server/mock-api.ts:
 *
 *   GET    /checkout/products              → { items }
 *   POST   /checkout/quote                 → totals for { items, delivery, promoCode? }
 *   POST   /checkout/orders                → 201 placed order (+ Location); body = quote body + customer
 *   GET    /checkout/orders/:id?phone=     → the order, only with the phone used at checkout (else 404)
 *   DELETE /checkout/orders/:id?phone=     → 204, removes the order (test cleanup)
 *
 * INTENTIONAL bugs (flags live in mock-api.ts getBugs, catalogued in the module 20 bug hunt task).
 * Rules and catalogue are shared with the page: src/playground/data/checkout.json.
 */

const STATUS = data.status;
const RULES = checkout.rules;
const PERCENT = 100;

export type DeliveryMethod = keyof typeof checkout.delivery;

export interface CheckoutBugs {
  courierBoundary: boolean;
  welcomeOnTotal: boolean;
  maxQtyIgnored: boolean;
  orderIgnoresPromo: boolean;
  trackingIgnoresPhone: boolean;
}

export interface QuoteLine {
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Quote {
  items: QuoteLine[];
  delivery: DeliveryMethod;
  promoCode: string | null;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
}

export interface Customer {
  name: string;
  phone: string;
  city: string;
  address: string | null;
}

export interface CheckoutOrder extends Quote {
  id: number;
  status: string;
  customer: Customer;
  createdAt: string;
}

export interface Outcome {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

type Checked<T> = { ok: true; value: T } | { ok: false; outcome: Outcome };

const fail = <T>(status: number, message: string): Checked<T> => ({ ok: false, outcome: { status, body: { error: message } } });
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const formatAmount = (n: number): string => n.toLocaleString('en-US');

export const CHECKOUT_PRODUCTS = checkout.products;
export const FIRST_CHECKOUT_ORDER_ID = RULES.firstOrderId;
export const CHECKOUT_PROCESSING_MS = RULES.processingMs;

const DELIVERY_METHODS = Object.keys(checkout.delivery) as DeliveryMethod[];

function isDelivery(v: unknown): v is DeliveryMethod {
  return typeof v === 'string' && (DELIVERY_METHODS as string[]).includes(v);
}

// Ukrainian mobile number: "+380" followed by exactly N digits (N = rules.phoneDigits).
// Matches: +380671234567 · Rejects: 0671234567, +38067123456, +380 67 123 45 67
// Test it: https://regex101.com/?regex=%5E%5C%2B380%5Cd%7B9%7D%24
export const phonePattern = (digits: number): RegExp => new RegExp(`^\\+380\\d{${digits}}$`);

// Every non-digit character (used to compare phones: "+" in a query string arrives as a space).
// Matches: "+", " ", "-" in "+380 67-123" · Rejects: 0–9
// Test it: https://regex101.com/?regex=%5CD&flags=g
const NON_DIGITS = /\D/g;
const digitsOnly = (text: string): string => text.replace(NON_DIGITS, '');

interface ParsedCart {
  lines: QuoteLine[];
  delivery: DeliveryMethod;
  promoCode: string | null;
}

function parseLines(items: unknown, bug: CheckoutBugs): Checked<QuoteLine[]> {
  if (!Array.isArray(items) || items.length === 0) return fail(STATUS.badRequest, 'items must be a non-empty array');
  const maxQuantity = bug.maxQtyIgnored ? RULES.buggyMaxQuantity : RULES.maxQuantity;
  const results = items.map((item): Checked<QuoteLine> => {
    if (!isObject(item) || !isInt(item.productId) || !isInt(item.quantity)) {
      return fail(STATUS.badRequest, 'Each item needs an integer productId and quantity');
    }
    if (item.quantity < RULES.minQuantity || item.quantity > maxQuantity) {
      return fail(STATUS.badRequest, `quantity must be from ${RULES.minQuantity} to ${RULES.maxQuantity}`);
    }
    const product = CHECKOUT_PRODUCTS.find((p) => p.id === item.productId);
    if (!product) return fail(STATUS.unprocessable, `Product ${item.productId} does not exist`);
    if (!product.inStock) return fail(STATUS.conflict, `${product.name} is out of stock`);
    const line: QuoteLine = { productId: product.id, name: product.name, unitPrice: product.price, quantity: item.quantity, lineTotal: product.price * item.quantity };
    return { ok: true, value: line };
  });
  const problem = results.find((r) => !r.ok);
  if (problem && !problem.ok) return problem;
  const lines = results.flatMap((r) => (r.ok ? [r.value] : []));
  const ids = new Set(lines.map((l) => l.productId));
  if (ids.size !== lines.length) return fail(STATUS.badRequest, 'Each product can appear only once');
  return { ok: true, value: lines };
}

function parsePromo(raw: unknown): Checked<string | null> {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  if (typeof raw !== 'string') return fail(STATUS.badRequest, 'promoCode must be a string');
  const code = raw.trim().toUpperCase();
  if (code === '') return { ok: true, value: null };
  return checkout.promoCodes.includes(code) ? { ok: true, value: code } : fail(STATUS.badRequest, 'Unknown promo code');
}

function parseCart(body: unknown, bug: CheckoutBugs): Checked<ParsedCart> {
  if (!isObject(body)) return fail(STATUS.badRequest, 'Body must be a JSON object with items and delivery');
  const lines = parseLines(body.items, bug);
  if (!lines.ok) return lines;
  if (!isDelivery(body.delivery)) return fail(STATUS.badRequest, `delivery must be one of: ${DELIVERY_METHODS.join(', ')}`);
  const promo = parsePromo(body.promoCode);
  if (!promo.ok) return promo;
  return { ok: true, value: { lines: lines.value, delivery: body.delivery, promoCode: promo.value } };
}

function deliveryFee(delivery: DeliveryMethod, subtotal: number, bug: CheckoutBugs): number {
  if (delivery !== 'courier') return checkout.delivery[delivery].fee;
  const free = bug.courierBoundary ? subtotal > RULES.freeCourierFrom : subtotal >= RULES.freeCourierFrom;
  return free ? 0 : checkout.delivery.courier.fee;
}

function discountFor(code: string | null, subtotal: number, fee: number, bug: CheckoutBugs): number {
  if (code === 'WELCOME5') {
    const base = bug.welcomeOnTotal ? subtotal + fee : subtotal;
    return Math.floor((base * RULES.welcomePercent) / PERCENT);
  }
  return code === 'MINUS200' ? RULES.minus200Amount : 0;
}

function priceCart(cart: ParsedCart, bug: CheckoutBugs): Checked<Quote> {
  const subtotal = cart.lines.reduce((sum, l) => sum + l.lineTotal, 0);
  if (cart.promoCode === 'MINUS200' && subtotal < RULES.minus200MinSubtotal) {
    return fail(STATUS.badRequest, `MINUS200 needs an order from ${formatAmount(RULES.minus200MinSubtotal)} UAH`);
  }
  const fee = deliveryFee(cart.delivery, subtotal, bug);
  const discount = discountFor(cart.promoCode, subtotal, fee, bug);
  return {
    ok: true,
    value: { items: cart.lines, delivery: cart.delivery, promoCode: cart.promoCode, subtotal, discount, deliveryFee: fee, total: subtotal - discount + fee },
  };
}

export function quoteCheckout(body: unknown, bug: CheckoutBugs): Outcome {
  const cart = parseCart(body, bug);
  if (!cart.ok) return cart.outcome;
  const quote = priceCart(cart.value, bug);
  return quote.ok ? { status: STATUS.ok, body: quote.value } : quote.outcome;
}

function parseCustomer(raw: unknown, delivery: DeliveryMethod): Checked<Customer> {
  if (!isObject(raw)) return fail(STATUS.badRequest, 'customer is required');
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (name.length < RULES.nameMinLength || name.length > RULES.nameMaxLength) {
    return fail(STATUS.badRequest, `customer.name must be ${RULES.nameMinLength}–${RULES.nameMaxLength} characters`);
  }
  const phone = typeof raw.phone === 'string' ? raw.phone.trim() : '';
  if (!phonePattern(RULES.phoneDigits).test(phone)) return fail(STATUS.badRequest, 'customer.phone must look like +380XXXXXXXXX');
  if (typeof raw.city !== 'string' || !checkout.cities.includes(raw.city)) {
    return fail(STATUS.badRequest, `customer.city must be one of: ${checkout.cities.join(', ')}`);
  }
  const address = typeof raw.address === 'string' ? raw.address.trim() : '';
  if (delivery !== 'pickup' && address === '') return fail(STATUS.badRequest, 'customer.address is required for post and courier delivery');
  return { ok: true, value: { name, phone, city: raw.city, address: delivery === 'pickup' ? null : address } };
}

export interface PlaceResult {
  outcome: Outcome;
  order?: CheckoutOrder;
}

export function placeCheckoutOrder(base: string, body: unknown, bug: CheckoutBugs, id: number, now: Date): PlaceResult {
  const cart = parseCart(body, bug);
  if (!cart.ok) return { outcome: cart.outcome };
  const quote = priceCart(cart.value, bug);
  if (!quote.ok) return { outcome: quote.outcome };
  const customer = parseCustomer(isObject(body) ? body.customer : undefined, cart.value.delivery);
  if (!customer.ok) return { outcome: customer.outcome };
  const priced = bug.orderIgnoresPromo ? { ...quote.value, discount: 0, total: quote.value.subtotal + quote.value.deliveryFee } : quote.value;
  const order: CheckoutOrder = { id, status: 'placed', ...priced, customer: customer.value, createdAt: now.toISOString() };
  return { order, outcome: { status: STATUS.created, body: order, headers: { Location: `${base}/checkout/orders/${id}` } } };
}

/** Finds an order the caller may see: the phone must match the one used at checkout. */
export function findCheckoutOrder(orders: CheckoutOrder[], rawId: string, phone: string | null, ignorePhone: boolean): Checked<CheckoutOrder> {
  const id = Number(rawId);
  if (!Number.isInteger(id)) return fail(STATUS.badRequest, 'Order id must be a number');
  const order = orders.find((o) => o.id === id);
  const phoneMatches = order !== undefined && phone !== null && digitsOnly(phone) === digitsOnly(order.customer.phone);
  if (!order || !(phoneMatches || ignorePhone)) return fail(STATUS.notFound, 'Order not found');
  return { ok: true, value: order };
}
