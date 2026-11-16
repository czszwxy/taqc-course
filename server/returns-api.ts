import returnsData from '../src/playground/data/returns.json';
import data from './mock-data.json';

/**
 * Gadgetly Returns API (module 32 "Final Project: Python") — pure handlers wired into server/mock-api.ts:
 *
 *   GET    /returns/orders/:id?email=   → the order, its lines and return windows (404 unless the email matches)
 *   POST   /returns/quote               → the refund for { orderId, email, items, reason, condition, refundMethod }
 *   POST   /returns                     → 201 return request (+ Location); body = quote body + comment
 *   GET    /returns/:id?email=          → the return request, only with the order's email (else 404)
 *   DELETE /returns/:id?email=          → 204, cancels (removes) the request — also used for test cleanup
 *
 * The demo has a fixed "today" (returns.json) so return windows are deterministic.
 * INTENTIONAL bugs (flags live in mock-api.ts getBugs, catalogued in the module 32 bug hunt task).
 * Rules and data are shared with the page: src/playground/data/returns.json.
 */

const STATUS = data.status;
const RULES = returnsData.rules;
const PERCENT = 100;
const MS_PER_DAY = 86_400_000;
const DELIVERED = 'delivered';
const CHANGED_MIND: ReturnReason = 'changed-mind';
const DEFECTIVE: ReturnReason = 'defective';

export type ReturnReason = keyof typeof returnsData.reasons;
export type ItemCondition = keyof typeof returnsData.conditions;
export type RefundMethod = keyof typeof returnsData.refundMethods;

export interface ReturnsBugs {
  windowBoundary: boolean;
  defectiveWindow: boolean;
  feeOnFaulty: boolean;
  bonusBeforeFees: boolean;
  overReturn: boolean;
  giftCardAccepted: boolean;
  trackingIgnoresEmail: boolean;
}

export interface OrderLine {
  lineId: number;
  name: string;
  category: string;
  price: number;
  quantity: number;
  returnable: boolean;
}

export interface ReturnableOrder {
  id: number;
  status: string;
  deliveredAt: string | null;
  /** Last day of the return window (YYYY-MM-DD), null until delivered. */
  returnUntil: string | null;
  /** Last day for items returned as defective. */
  defectiveReturnUntil: string | null;
  lines: OrderLine[];
}

export interface ReturnLine {
  lineId: number;
  name: string;
  price: number;
  quantity: number;
  value: number;
}

export interface ReturnQuote {
  orderId: number;
  reason: ReturnReason;
  condition: ItemCondition;
  refundMethod: RefundMethod;
  items: ReturnLine[];
  itemsValue: number;
  restockingFee: number;
  returnShipping: number;
  storeCreditBonus: number;
  refund: number;
}

export interface ReturnRequest extends ReturnQuote {
  id: number;
  status: string;
  email: string;
  comment: string | null;
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
const percentOf = (amount: number, percent: number): number => Math.floor((amount * percent) / PERCENT);
const sameEmail = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

export const FIRST_RETURN_ID = RULES.firstReturnId;

const REASONS = Object.keys(returnsData.reasons) as ReturnReason[];
const CONDITIONS = Object.keys(returnsData.conditions) as ItemCondition[];
const REFUND_METHODS = Object.keys(returnsData.refundMethods) as RefundMethod[];

const oneOf = <T extends string>(allowed: readonly T[], v: unknown): v is T => typeof v === 'string' && (allowed as readonly string[]).includes(v);

/** Whole days between two YYYY-MM-DD dates (UTC, no time-of-day surprises). */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / MS_PER_DAY);
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(date) + days * MS_PER_DAY).toISOString().slice(0, returnsData.today.length);
}

type SeedOrder = (typeof returnsData.orders)[number];

function toReturnable(order: SeedOrder): ReturnableOrder {
  const delivered = order.deliveredAt;
  return {
    id: order.id,
    status: order.status,
    deliveredAt: delivered,
    returnUntil: delivered === null ? null : addDays(delivered, RULES.windowDays),
    defectiveReturnUntil: delivered === null ? null : addDays(delivered, RULES.defectiveWindowDays),
    lines: order.lines.map((l) => ({ ...l, returnable: !returnsData.nonReturnableCategories.includes(l.category) })),
  };
}

function findOrder(rawId: unknown, email: unknown): Checked<SeedOrder> {
  const id = typeof rawId === 'string' ? Number(rawId) : rawId;
  if (!isInt(id)) return fail(STATUS.badRequest, 'Order id must be a number');
  const order = returnsData.orders.find((o) => o.id === id);
  if (!order || typeof email !== 'string' || !sameEmail(email, order.email)) return fail(STATUS.notFound, 'Order not found');
  return { ok: true, value: order };
}

/** GET /returns/orders/:id?email= */
export function lookupOrder(rawId: string, email: string | null): Outcome {
  const found = findOrder(rawId, email);
  return found.ok ? { status: STATUS.ok, body: toReturnable(found.value) } : found.outcome;
}

interface ParsedReturn {
  order: SeedOrder;
  email: string;
  reason: ReturnReason;
  condition: ItemCondition;
  refundMethod: RefundMethod;
  lines: ReturnLine[];
}

function parseLine(order: SeedOrder, item: unknown, bug: ReturnsBugs): Checked<ReturnLine> {
  if (!isObject(item) || !isInt(item.lineId) || !isInt(item.quantity)) return fail(STATUS.badRequest, 'Each item needs an integer lineId and quantity');
  const line = order.lines.find((l) => l.lineId === item.lineId);
  if (!line) return fail(STATUS.unprocessable, `Order #${order.id} has no line ${item.lineId}`);
  if (returnsData.nonReturnableCategories.includes(line.category) && !bug.giftCardAccepted) {
    return fail(STATUS.unprocessable, `${line.category} cannot be returned`);
  }
  const tooMany = item.quantity > line.quantity && !bug.overReturn;
  if (item.quantity < 1 || tooMany) return fail(STATUS.badRequest, `Quantity for ${line.name} must be from 1 to ${line.quantity}`);
  return { ok: true, value: { lineId: line.lineId, name: line.name, price: line.price, quantity: item.quantity, value: line.price * item.quantity } };
}

function parseLines(order: SeedOrder, items: unknown, bug: ReturnsBugs): Checked<ReturnLine[]> {
  if (!Array.isArray(items) || items.length === 0) return fail(STATUS.badRequest, 'items must be a non-empty array');
  const results = items.map((item) => parseLine(order, item, bug));
  const problem = results.find((r) => !r.ok);
  if (problem && !problem.ok) return problem;
  const lines = results.flatMap((r) => (r.ok ? [r.value] : []));
  if (new Set(lines.map((l) => l.lineId)).size !== lines.length) return fail(STATUS.badRequest, 'Each line can appear only once');
  return { ok: true, value: lines };
}

function windowDaysFor(reason: ReturnReason, bug: ReturnsBugs): number {
  return reason === DEFECTIVE && !bug.defectiveWindow ? RULES.defectiveWindowDays : RULES.windowDays;
}

function checkWindow(order: SeedOrder, reason: ReturnReason, bug: ReturnsBugs): Checked<true> {
  if (order.status !== DELIVERED || order.deliveredAt === null) return fail(STATUS.conflict, `Order #${order.id} is not delivered yet`);
  const days = daysBetween(order.deliveredAt, returnsData.today);
  const windowDays = windowDaysFor(reason, bug);
  const open = bug.windowBoundary ? days < windowDays : days <= windowDays;
  if (open) return { ok: true, value: true };
  return fail(STATUS.unprocessable, `Return window closed: this order could be returned until ${addDays(order.deliveredAt, windowDays)}`);
}

function parseReturn(body: unknown, bug: ReturnsBugs): Checked<ParsedReturn> {
  if (!isObject(body)) return fail(STATUS.badRequest, 'Body must be a JSON object with orderId, email, items, reason, condition and refundMethod');
  const order = findOrder(body.orderId, body.email);
  if (!order.ok) return order;
  if (!oneOf(REASONS, body.reason)) return fail(STATUS.badRequest, `reason must be one of: ${REASONS.join(', ')}`);
  if (!oneOf(CONDITIONS, body.condition)) return fail(STATUS.badRequest, `condition must be one of: ${CONDITIONS.join(', ')}`);
  if (!oneOf(REFUND_METHODS, body.refundMethod)) return fail(STATUS.badRequest, `refundMethod must be one of: ${REFUND_METHODS.join(', ')}`);
  const window = checkWindow(order.value, body.reason, bug);
  if (!window.ok) return window;
  const lines = parseLines(order.value, body.items, bug);
  if (!lines.ok) return lines;
  return {
    ok: true,
    value: { order: order.value, email: String(body.email).trim(), reason: body.reason, condition: body.condition, refundMethod: body.refundMethod, lines: lines.value },
  };
}

function restockingFee(parsed: ParsedReturn, itemsValue: number, bug: ReturnsBugs): number {
  const charged = parsed.reason === CHANGED_MIND || bug.feeOnFaulty;
  return parsed.condition === 'opened' && charged ? percentOf(itemsValue, RULES.restockingPercent) : 0;
}

function priceReturn(parsed: ParsedReturn, bug: ReturnsBugs): ReturnQuote {
  const itemsValue = parsed.lines.reduce((sum, l) => sum + l.value, 0);
  const fee = restockingFee(parsed, itemsValue, bug);
  const returnShipping = parsed.reason === CHANGED_MIND ? RULES.returnShippingFee : 0;
  const base = Math.max(0, itemsValue - fee - returnShipping);
  const bonusBase = bug.bonusBeforeFees ? itemsValue : base;
  const storeCreditBonus = parsed.refundMethod === 'store-credit' ? percentOf(bonusBase, RULES.storeCreditBonusPercent) : 0;
  return {
    orderId: parsed.order.id,
    reason: parsed.reason,
    condition: parsed.condition,
    refundMethod: parsed.refundMethod,
    items: parsed.lines,
    itemsValue,
    restockingFee: fee,
    returnShipping,
    storeCreditBonus,
    refund: base + storeCreditBonus,
  };
}

/** POST /returns/quote */
export function quoteReturn(body: unknown, bug: ReturnsBugs): Outcome {
  const parsed = parseReturn(body, bug);
  return parsed.ok ? { status: STATUS.ok, body: priceReturn(parsed.value, bug) } : parsed.outcome;
}

function parseComment(raw: unknown, reason: ReturnReason): Checked<string | null> {
  if (raw !== undefined && raw !== null && typeof raw !== 'string') return fail(STATUS.badRequest, 'comment must be a string');
  const comment = typeof raw === 'string' ? raw.trim() : '';
  const required = returnsData.commentRequiredFor.includes(reason);
  const tooShort = required && comment.length < RULES.commentMinLength;
  if (tooShort || comment.length > RULES.commentMaxLength) {
    const range = required ? `${RULES.commentMinLength}–${RULES.commentMaxLength}` : `up to ${RULES.commentMaxLength}`;
    return fail(STATUS.badRequest, `comment must be ${range} characters for this reason`);
  }
  return { ok: true, value: comment === '' ? null : comment };
}

export interface CreateResult {
  outcome: Outcome;
  request?: ReturnRequest;
}

/** POST /returns */
export function createReturn(base: string, body: unknown, bug: ReturnsBugs, id: number, now: Date): CreateResult {
  const parsed = parseReturn(body, bug);
  if (!parsed.ok) return { outcome: parsed.outcome };
  const comment = parseComment(isObject(body) ? body.comment : undefined, parsed.value.reason);
  if (!comment.ok) return { outcome: comment.outcome };
  const request: ReturnRequest = { id, status: 'requested', email: parsed.value.email, comment: comment.value, ...priceReturn(parsed.value, bug), createdAt: now.toISOString() };
  return { request, outcome: { status: STATUS.created, body: request, headers: { Location: `${base}/returns/${id}` } } };
}

/** Finds a return request the caller may see: the email must be the order's email. */
export function findReturn(requests: ReturnRequest[], rawId: string, email: string | null, ignoreEmail: boolean): Checked<ReturnRequest> {
  const id = Number(rawId);
  if (!Number.isInteger(id)) return fail(STATUS.badRequest, 'Return id must be a number');
  const request = requests.find((r) => r.id === id);
  const emailMatches = request !== undefined && email !== null && sameEmail(email, request.email);
  if (!request || !(emailMatches || ignoreEmail)) return fail(STATUS.notFound, 'Return not found');
  return { ok: true, value: request };
}
