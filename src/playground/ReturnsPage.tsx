import { useEffect, useRef, useState, type FormEvent } from 'react';
import returnsData from './data/returns.json';
import type { ItemCondition, OrderLine, RefundMethod, ReturnQuote, ReturnReason, ReturnRequest, ReturnableOrder } from '../../server/returns-api';
import { FieldError, PgField, PlaygroundShell, formatUah, inputClass, isFixedMode, withLabMode } from './PlaygroundShell';

/**
 * Bug Playground: Gadgetly Returns & refunds — the system under test of module 32 "Final Project: Python".
 * Find a delivered order → choose items, reason, condition and refund method → the refund summary is priced
 * by the returns API (server/returns-api.ts, which has its own bugs) → request the return → track or cancel it.
 * 4 INTENTIONAL page bugs below. Open with `?fixed` for the correct version (it also uses /api-fixed).
 * Keep the flags in sync with `bugIds` in registry.ts (page flags first, then the API flags) and with the tasks.
 */

function getBugs(fixed: boolean) {
  const on = !fixed;
  return {
    qtyAboveBought: on, // "+" stays enabled at the purchased quantity, so you can ask to return one more
    staleCondition: on, // switching Unopened / Opened does not re-price the refund summary
    commentLength: on, // a comment of exactly 300 characters is rejected (max is 300)
    confirmationItemValue: on, // the confirmation shows the items value instead of the refund
  };
}

const RULES = returnsData.rules;
const REASONS = returnsData.reasons;
const CONDITIONS = returnsData.conditions;
const REFUND_METHODS = returnsData.refundMethods;
const REASON_IDS = Object.keys(REASONS) as ReturnReason[];
const CONDITION_IDS = Object.keys(CONDITIONS) as ItemCondition[];
const METHOD_IDS = Object.keys(REFUND_METHODS) as RefundMethod[];
const DEFAULT_CONDITION: ItemCondition = 'unopened';
const DEFAULT_METHOD: RefundMethod = 'original';
const STEP = 1;
const FIRST_QUANTITY = 1;

const MSG = {
  failed: 'Something went wrong. Try again.',
  notFound: 'Order not found. Check the order number and the email.',
  notDelivered: 'This order is not delivered yet. Returns open after delivery.',
  noItems: 'Select at least one item to return',
  reason: 'Choose a reason',
  commentShort: `Describe the problem (${RULES.commentMinLength}–${RULES.commentMaxLength} characters)`,
  commentLong: `Comment is too long (max ${RULES.commentMaxLength} characters)`,
  trackNotFound: 'Return not found. Check the return number and the email.',
};

type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

const NO_CONTENT = 204;

async function callApi<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, init);
    if (res.status === NO_CONTENT) return { ok: true, data: undefined as T };
    const data = (await res.json()) as T & { error?: string };
    if (res.ok) return { ok: true, data };
    return { ok: false, message: data.error ?? MSG.failed };
  } catch {
    return { ok: false, message: MSG.failed };
  }
}

const postJson = <T,>(url: string, body: unknown): Promise<ApiResult<T>> =>
  callApi<T>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

function formatDate(date: string): string {
  return new Date(Date.parse(date)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Line id → quantity to return, only for the selected lines. */
type Selection = Record<number, number>;

interface FormErrors {
  items?: string;
  reason?: string;
  comment?: string;
}

function commentError(comment: string, reason: ReturnReason | '', rejectAtMax: boolean): string | undefined {
  const length = comment.trim().length;
  const tooLong = rejectAtMax ? length >= RULES.commentMaxLength : length > RULES.commentMaxLength;
  if (tooLong) return MSG.commentLong;
  const required = reason !== '' && returnsData.commentRequiredFor.includes(reason);
  return required && length < RULES.commentMinLength ? MSG.commentShort : undefined;
}

function validate(selection: Selection, reason: ReturnReason | '', comment: string, rejectAtMax: boolean): FormErrors {
  const errors: FormErrors = {};
  if (Object.keys(selection).length === 0) errors.items = MSG.noItems;
  if (reason === '') errors.reason = MSG.reason;
  const commentProblem = commentError(comment, reason, rejectAtMax);
  if (commentProblem) errors.comment = commentProblem;
  return errors;
}

const toItems = (selection: Selection) => Object.entries(selection).map(([lineId, quantity]) => ({ lineId: Number(lineId), quantity }));

export function ReturnsPage() {
  const fixed = isFixedMode();
  const bug = withLabMode(getBugs(fixed));
  const api = fixed ? '/api-fixed/returns' : '/api/returns';

  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [order, setOrder] = useState<ReturnableOrder | null>(null);
  const [orderEmail, setOrderEmail] = useState('');
  const [selection, setSelection] = useState<Selection>({});
  const [reason, setReason] = useState<ReturnReason | ''>('');
  const [condition, setCondition] = useState<ItemCondition>(DEFAULT_CONDITION);
  const [pricedCondition, setPricedCondition] = useState<ItemCondition>(DEFAULT_CONDITION);
  const [refundMethod, setRefundMethod] = useState<RefundMethod>(DEFAULT_METHOD);
  const [comment, setComment] = useState('');
  const [quote, setQuote] = useState<ReturnQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<ReturnRequest | null>(null);
  const latestQuote = useRef(0);

  const hasItems = Object.keys(selection).length > 0;
  const delivered = order?.status === 'delivered';

  useEffect(() => {
    latestQuote.current += 1;
    const requestNo = latestQuote.current;
    if (!order || !delivered || !hasItems || reason === '') {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    const load = async (): Promise<void> => {
      const body = { orderId: order.id, email: orderEmail, items: toItems(selection), reason, condition: pricedCondition, refundMethod };
      const result = await postJson<ReturnQuote>(`${api}/quote`, body);
      if (requestNo !== latestQuote.current) return; // a newer change is already being priced
      setQuote(result.ok ? result.data : null);
      setQuoteError(result.ok ? null : result.message);
    };
    void load();
  }, [api, order, delivered, orderEmail, selection, hasItems, reason, pricedCondition, refundMethod]);

  const resetForm = () => {
    setSelection({});
    setReason('');
    setCondition(DEFAULT_CONDITION);
    setPricedCondition(DEFAULT_CONDITION);
    setRefundMethod(DEFAULT_METHOD);
    setComment('');
    setErrors({});
    setSubmitError(null);
    setCreated(null);
  };

  const findOrder = async (e: FormEvent) => {
    e.preventDefault();
    const id = orderNumber.trim().replace('#', '');
    const result = await callApi<ReturnableOrder>(`${api}/orders/${encodeURIComponent(id)}?email=${encodeURIComponent(email.trim())}`);
    resetForm();
    if (result.ok) {
      setOrder(result.data);
      setOrderEmail(email.trim());
      setLookupError(null);
    } else {
      setOrder(null);
      setLookupError(MSG.notFound);
    }
  };

  const toggleLine = (line: OrderLine, checked: boolean) => {
    setSelection((current) => {
      const rest = Object.fromEntries(Object.entries(current).filter(([id]) => Number(id) !== line.lineId));
      return checked ? { ...rest, [line.lineId]: FIRST_QUANTITY } : rest;
    });
  };

  const changeQuantity = (lineId: number, step: number) => {
    setSelection((current) => ({ ...current, [lineId]: (current[lineId] ?? FIRST_QUANTITY) + step }));
  };

  const chooseCondition = (value: ItemCondition) => {
    setCondition(value);
    if (!bug.staleCondition) setPricedCondition(value);
  };

  const requestReturn = async (e: FormEvent) => {
    e.preventDefault();
    if (!order || submitting) return;
    const found = validate(selection, reason, comment, bug.commentLength);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSubmitting(true);
    setSubmitError(null);
    const body = { orderId: order.id, email: orderEmail, items: toItems(selection), reason, condition, refundMethod, comment };
    const result = await postJson<ReturnRequest>(api, body);
    setSubmitting(false);
    if (result.ok) setCreated(result.data);
    else setSubmitError(`Could not request the return: ${result.message}`);
  };

  const resetAll = () => {
    setOrderNumber('');
    setEmail('');
    setLookupError(null);
    setOrder(null);
    setOrderEmail('');
    resetForm();
  };

  const requirements = (
    <>
      <li>
        <b>Demo date</b>: today is <b>{formatDate(returnsData.today)}</b> (fixed for this demo). Find an order by its number and the email used for it (any letter
        case). Orders that are not delivered yet cannot be returned.
      </li>
      <li>
        <b>Return window</b>: {RULES.windowDays} days after delivery, the last day included; for the reason <i>Defective</i> — {RULES.defectiveWindowDays} days.
      </li>
      <li>
        <b>Items</b>: choose at least one; quantity from 1 to the purchased quantity (“+” is disabled at it). Gift cards cannot be returned. This demo does not
        track earlier returns: each request is checked against the purchased quantity.
      </li>
      <li>
        <b>Refund</b> = items value − restocking fee − return shipping. For <i>Changed my mind</i>: return shipping {formatUah(RULES.returnShippingFee)} and, for{' '}
        <b>opened</b> items, a {RULES.restockingPercent} % restocking fee (rounded down). Defective, wrong or damaged items: no fees. <b>Store credit</b> adds{' '}
        {RULES.storeCreditBonusPercent} % of the refund (after fees, rounded down). The summary is re-priced after every change.
      </li>
      <li>
        <b>Comment</b>: up to {RULES.commentMaxLength} characters; required ({RULES.commentMinLength}–{RULES.commentMaxLength}) for <i>Defective</i> and{' '}
        <i>Damaged in delivery</i>.
      </li>
      <li>
        <b>Request return</b> → confirmation with the return number and the <b>same refund</b> as the summary. <b>Track a return</b>: return number + the order's
        email; any other email → “Return not found”. A requested return can be cancelled.
      </li>
      <li>
        API: <code>GET /api/returns/orders/:id?email=</code>, <code>POST /api/returns/quote</code>, <code>POST /api/returns</code>, <code>GET</code> /{' '}
        <code>DELETE /api/returns/:id?email=</code>.
      </li>
    </>
  );

  return (
    <PlaygroundShell brand="gadgetly" fixed={fixed} requirements={requirements} onReset={resetAll}>
      <h1 className="text-2xl font-bold">Return an item</h1>
      <form onSubmit={(e) => void findOrder(e)} className="mt-4 flex flex-wrap items-end gap-3" aria-label="Find your order">
        <div>
          <label htmlFor="order-number" className="mb-1 block text-sm font-medium text-slate-700">
            Order number
          </label>
          <input id="order-number" className={inputClass(false)} value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
        </div>
        <div className="min-w-[240px] flex-1">
          <label htmlFor="order-email" className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input id="order-email" type="email" className={inputClass(false)} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="submit" className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900">
          Find order
        </button>
      </form>
      {lookupError && (
        <p role="alert" data-testid="lookup-error" className="mt-3 text-sm text-red-600">
          {lookupError}
        </p>
      )}

      {order && created && <Confirmation request={created} showItemsValue={bug.confirmationItemValue} onNew={resetForm} />}

      {order && !created && (
        <section aria-label="Order" data-testid="order-card" className="mt-6 rounded-lg border border-slate-200 p-4">
          <h2 className="font-semibold">
            Order #{order.id}
            {order.deliveredAt && <span className="font-normal text-slate-600"> · delivered {formatDate(order.deliveredAt)}</span>}
          </h2>
          {delivered ? (
            <ReturnForm
              order={order}
              selection={selection}
              allowExtra={bug.qtyAboveBought}
              reason={reason}
              condition={condition}
              refundMethod={refundMethod}
              comment={comment}
              errors={errors}
              quote={quote}
              quoteError={quoteError}
              submitting={submitting}
              submitError={submitError}
              onToggle={toggleLine}
              onQuantity={changeQuantity}
              onReason={setReason}
              onCondition={chooseCondition}
              onMethod={setRefundMethod}
              onComment={setComment}
              onSubmit={(e) => void requestReturn(e)}
            />
          ) : (
            <p role="alert" data-testid="not-delivered" className="mt-2 text-sm text-amber-700">
              {MSG.notDelivered}
            </p>
          )}
        </section>
      )}

      <TrackReturn api={api} />
    </PlaygroundShell>
  );
}

interface ReturnFormProps {
  order: ReturnableOrder;
  selection: Selection;
  allowExtra: boolean;
  reason: ReturnReason | '';
  condition: ItemCondition;
  refundMethod: RefundMethod;
  comment: string;
  errors: FormErrors;
  quote: ReturnQuote | null;
  quoteError: string | null;
  submitting: boolean;
  submitError: string | null;
  onToggle: (line: OrderLine, checked: boolean) => void;
  onQuantity: (lineId: number, step: number) => void;
  onReason: (reason: ReturnReason | '') => void;
  onCondition: (condition: ItemCondition) => void;
  onMethod: (method: RefundMethod) => void;
  onComment: (comment: string) => void;
  onSubmit: (e: FormEvent) => void;
}

function ReturnForm(props: ReturnFormProps) {
  const { order, selection, errors } = props;
  return (
    <form onSubmit={props.onSubmit} noValidate className="mt-3 space-y-5">
      <p className="text-sm text-slate-600" data-testid="return-window">
        Returns accepted until {formatDate(order.returnUntil ?? '')} · Defective items: until {formatDate(order.defectiveReturnUntil ?? '')}
      </p>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Items to return</legend>
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {order.lines.map((line) => (
            <LineRow
              key={line.lineId}
              line={line}
              quantity={selection[line.lineId]}
              allowExtra={props.allowExtra}
              onToggle={props.onToggle}
              onQuantity={props.onQuantity}
            />
          ))}
        </ul>
        <FieldError id="items" message={errors.items} />
      </fieldset>

      <PgField id="reason" label="Reason" error={errors.reason}>
        <select id="reason" className={inputClass(Boolean(errors.reason))} value={props.reason} onChange={(e) => props.onReason(e.target.value as ReturnReason | '')}>
          <option value="">Choose a reason</option>
          {REASON_IDS.map((id) => (
            <option key={id} value={id}>
              {REASONS[id]}
            </option>
          ))}
        </select>
      </PgField>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset>
          <legend className="mb-1 text-sm font-semibold">Item condition</legend>
          {CONDITION_IDS.map((id) => (
            <label key={id} className="flex items-center gap-2 text-[15px]">
              <input type="radio" name="condition" value={id} checked={props.condition === id} onChange={() => props.onCondition(id)} />
              {CONDITIONS[id]}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend className="mb-1 text-sm font-semibold">Refund to</legend>
          {METHOD_IDS.map((id) => (
            <label key={id} className="flex items-center gap-2 text-[15px]">
              <input type="radio" name="refund-method" value={id} checked={props.refundMethod === id} onChange={() => props.onMethod(id)} />
              {REFUND_METHODS[id]}
            </label>
          ))}
        </fieldset>
      </div>

      <PgField id="comment" label="Comment" error={errors.comment}>
        <textarea
          id="comment"
          rows={3}
          className={inputClass(Boolean(errors.comment))}
          value={props.comment}
          onChange={(e) => props.onComment(e.target.value)}
          aria-describedby="comment-hint"
        />
        <div className="mt-1 flex justify-between text-xs text-slate-500">
          <span id="comment-hint">
            Required for Defective and Damaged in delivery ({RULES.commentMinLength}–{RULES.commentMaxLength} characters)
          </span>
          <span data-testid="comment-counter">
            {props.comment.trim().length} / {RULES.commentMaxLength}
          </span>
        </div>
      </PgField>

      <RefundSummary quote={props.quote} error={props.quoteError} hasItems={Object.keys(selection).length > 0} hasReason={props.reason !== ''} />

      {props.submitError && (
        <p role="alert" data-testid="submit-error" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {props.submitError}
        </p>
      )}
      <button
        type="submit"
        disabled={props.submitting}
        className="w-full rounded-md bg-orange-500 py-2.5 font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
      >
        {props.submitting ? 'Sending…' : 'Request return'}
      </button>
    </form>
  );
}

interface LineRowProps {
  line: OrderLine;
  quantity: number | undefined;
  allowExtra: boolean;
  onToggle: (line: OrderLine, checked: boolean) => void;
  onQuantity: (lineId: number, step: number) => void;
}

function LineRow({ line, quantity, allowExtra, onToggle, onQuantity }: LineRowProps) {
  const selected = quantity !== undefined;
  const maxQuantity = allowExtra ? line.quantity + STEP : line.quantity;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5" data-testid={`line-${line.lineId}`}>
      <div className="flex items-center gap-3">
        {line.returnable ? (
          <input type="checkbox" aria-label={`Return ${line.name}`} checked={selected} onChange={(e) => onToggle(line, e.target.checked)} className="h-4 w-4" />
        ) : (
          <span className="w-4" />
        )}
        <div>
          <div className="font-medium">{line.name}</div>
          <div className="text-sm text-slate-500">
            {formatUah(line.price)} × {line.quantity} bought
          </div>
        </div>
      </div>
      {!line.returnable && (
        <span data-testid="not-returnable" className="text-sm font-medium text-slate-500">
          Not returnable
        </span>
      )}
      {selected && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={`Decrease ${line.name}`}
            disabled={quantity <= FIRST_QUANTITY}
            onClick={() => onQuantity(line.lineId, -STEP)}
            className="h-8 w-8 rounded border border-slate-300 disabled:opacity-40"
          >
            −
          </button>
          <span className="w-6 text-center" data-testid={`qty-${line.lineId}`}>
            {quantity}
          </span>
          <button
            type="button"
            aria-label={`Increase ${line.name}`}
            disabled={quantity >= maxQuantity}
            onClick={() => onQuantity(line.lineId, STEP)}
            className="h-8 w-8 rounded border border-slate-300 disabled:opacity-40"
          >
            +
          </button>
        </div>
      )}
    </li>
  );
}

function summaryHint(hasItems: boolean, hasReason: boolean): string {
  if (!hasItems) return 'Select items to see your refund';
  return hasReason ? 'Calculating…' : 'Choose a reason to see your refund';
}

function RefundSummary({ quote, error, hasItems, hasReason }: { quote: ReturnQuote | null; error: string | null; hasItems: boolean; hasReason: boolean }) {
  const deduction = (amount: number): string => (amount > 0 ? `-${formatUah(amount)}` : '—');
  const rows = quote
    ? [
        { id: 'items', label: 'Items value', value: formatUah(quote.itemsValue) },
        { id: 'restocking', label: 'Restocking fee', value: deduction(quote.restockingFee) },
        { id: 'shipping', label: 'Return shipping', value: deduction(quote.returnShipping) },
        { id: 'bonus', label: 'Store credit bonus', value: quote.storeCreditBonus > 0 ? `+${formatUah(quote.storeCreditBonus)}` : '—' },
      ]
    : [];
  return (
    <section aria-label="Refund summary" className="rounded-lg bg-slate-50 p-4">
      <h3 className="font-semibold">Refund summary</h3>
      {error && (
        <p role="alert" data-testid="quote-error" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {!quote && !error && <p className="mt-2 text-sm text-slate-500">{summaryHint(hasItems, hasReason)}</p>}
      <dl className="mt-2 space-y-1 text-[15px]">
        {rows.map((r) => (
          <div key={r.id} className="flex justify-between">
            <dt>{r.label}</dt>
            <dd data-testid={`summary-${r.id}`}>{r.value}</dd>
          </div>
        ))}
        {quote && (
          <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-bold">
            <dt>Refund</dt>
            <dd data-testid="summary-refund">{formatUah(quote.refund)}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

function Confirmation({ request, showItemsValue, onNew }: { request: ReturnRequest; showItemsValue: boolean; onNew: () => void }) {
  const amount = showItemsValue ? request.itemsValue : request.refund;
  return (
    <section data-testid="confirmation" className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
      <h2 className="text-xl font-semibold text-emerald-900">
        Return <span data-testid="return-number">#{request.id}</span> requested
      </h2>
      <p className="mt-2">
        Refund: <b data-testid="confirmation-refund">{formatUah(amount)}</b> — {REFUND_METHODS[request.refundMethod]}.
      </p>
      <p className="mt-1 text-sm text-slate-600">Track it any time with the return number and the order's email.</p>
      <button type="button" onClick={onNew} className="mt-4 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50">
        Return another item
      </button>
    </section>
  );
}

type TrackState = { kind: 'idle' } | { kind: 'found'; request: ReturnRequest } | { kind: 'cancelled'; id: number } | { kind: 'error'; message: string };

function TrackReturn({ api }: { api: string }) {
  const [number, setNumber] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<TrackState>({ kind: 'idle' });

  const url = (id: string | number) => `${api}/${encodeURIComponent(String(id))}?email=${encodeURIComponent(email.trim())}`;

  const track = async (e: FormEvent) => {
    e.preventDefault();
    const result = await callApi<ReturnRequest>(url(number.trim().replace('#', '')));
    setState(result.ok ? { kind: 'found', request: result.data } : { kind: 'error', message: MSG.trackNotFound });
  };

  const cancel = async (id: number) => {
    const result = await callApi<undefined>(url(id), { method: 'DELETE' });
    setState(result.ok ? { kind: 'cancelled', id } : { kind: 'error', message: result.message });
  };

  return (
    <section aria-label="Track a return" className="mt-8 border-t border-slate-200 pt-5">
      <h2 className="font-semibold">Track a return</h2>
      <form onSubmit={(e) => void track(e)} className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="track-number" className="mb-1 block text-sm font-medium text-slate-700">
            Return number
          </label>
          <input id="track-number" className={inputClass(false)} value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>
        <div>
          <label htmlFor="track-email" className="mb-1 block text-sm font-medium text-slate-700">
            Email used for the order
          </label>
          <input id="track-email" type="email" className={inputClass(false)} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="submit" className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900">
          Track
        </button>
      </form>
      {state.kind === 'found' && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <p data-testid="track-result">
            Return #{state.request.id} — {state.request.status} — refund {formatUah(state.request.refund)}
          </p>
          <button type="button" onClick={() => void cancel(state.request.id)} className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50">
            Cancel return
          </button>
        </div>
      )}
      {state.kind === 'cancelled' && (
        <p role="status" data-testid="track-cancelled" className="mt-3 text-sm text-emerald-700">
          Return #{state.id} cancelled
        </p>
      )}
      {state.kind === 'error' && (
        <p role="alert" data-testid="track-error" className="mt-3 text-sm text-red-600">
          {state.message}
        </p>
      )}
    </section>
  );
}
