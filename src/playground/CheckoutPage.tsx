import { useEffect, useRef, useState, type FormEvent } from 'react';
import checkout from './data/checkout.json';
import { phonePattern, type CheckoutOrder, type DeliveryMethod, type Quote } from '../../server/checkout-api';
import { FieldError, PgField, PlaygroundShell, formatUah, inputClass, isFixedMode, withLabMode } from './PlaygroundShell';

/**
 * Bug Playground: Gadgetly Checkout — the system under test of module 20 "Final Portfolio Project".
 * Cart → delivery → contact details → promo code → place order → confirmation, plus "Track an order".
 * Totals always come from the checkout API (server/checkout-api.ts), which has its own bugs.
 * 7 INTENTIONAL page bugs below. Open with `?fixed` for the correct version (it also uses /api-fixed).
 * Keep the flags in sync with `bugIds` in registry.ts (page flags first, then the API flags) and with the tasks.
 */

function getBugs(fixed: boolean) {
  const on = !fixed;
  return {
    plusAtMax: on, // "+" stays enabled at quantity 5, so the cart can ask for 6
    phoneShort: on, // the phone check also accepts +380 and 8 digits (the API then rejects the order)
    addressForPickup: on, // the address field stays visible and required for "Pickup in store"
    staleDelivery: on, // changing the delivery method does not re-price the order summary
    promoRemoveStale: on, // "Remove" hides the promo code, but the discount stays in the summary
    doubleSubmit: on, // "Place order" is not disabled while processing: a double click places two orders
    confirmationSubtotal: on, // the confirmation shows the subtotal instead of the total
  };
}

const RULES = checkout.rules;
const PRODUCTS = checkout.products;
const DELIVERY = checkout.delivery;
const DELIVERY_METHODS = Object.keys(DELIVERY) as DeliveryMethod[];
const DEFAULT_DELIVERY: DeliveryMethod = 'post';
const DEFAULT_CITY = checkout.cities[0] ?? '';

const MSG = {
  failed: 'Something went wrong. Try again.',
  name: `Enter your full name (${RULES.nameMinLength}–${RULES.nameMaxLength} characters)`,
  phone: 'Phone must look like +380XXXXXXXXX',
  address: 'Enter the delivery address',
  promoEmpty: 'Enter a promo code',
  notFound: 'Order not found. Check the number and the phone.',
};

interface CartLine {
  productId: number;
  quantity: number;
}

interface Contact {
  name: string;
  phone: string;
  city: string;
  address: string;
}

type ContactErrors = Partial<Record<keyof Contact, string>>;

const EMPTY_CONTACT: Contact = { name: '', phone: '', city: DEFAULT_CITY, address: '' };

type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

async function callApi<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, init);
    const data = (await res.json()) as T & { error?: string };
    if (res.ok) return { ok: true, data };
    return { ok: false, message: data.error ?? MSG.failed };
  } catch {
    return { ok: false, message: MSG.failed };
  }
}

const postJson = <T,>(url: string, body: unknown): Promise<ApiResult<T>> =>
  callApi<T>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

function productName(productId: number): string {
  return PRODUCTS.find((p) => p.id === productId)?.name ?? `Product ${productId}`;
}

function feeText(fee: number): string {
  return fee === 0 ? 'Free' : formatUah(fee);
}

function deliveryOptionLabel(method: DeliveryMethod): string {
  const option = DELIVERY[method];
  return `${option.label} — ${feeText(option.fee)}`;
}

function validateContact(contact: Contact, needsAddress: boolean, phoneRe: RegExp): ContactErrors {
  const name = contact.name.trim();
  const errors: ContactErrors = {};
  if (name.length < RULES.nameMinLength || name.length > RULES.nameMaxLength) errors.name = MSG.name;
  if (!phoneRe.test(contact.phone.trim())) errors.phone = MSG.phone;
  if (needsAddress && contact.address.trim() === '') errors.address = MSG.address;
  return errors;
}

// Phone check of the buggy build: "+380" and 8 OR 9 digits (the requirement is exactly 9).
// Matches: +380671234567, +38067123456 · Rejects: 0671234567, +3806712345
// Test it: https://regex101.com/?regex=%5E%5C%2B380%5Cd%7B8%2C9%7D%24
const buggyPhonePattern = new RegExp(`^\\+380\\d{${RULES.buggyPhoneDigits},${RULES.phoneDigits}}$`);

export function CheckoutPage() {
  const fixed = isFixedMode();
  const bug = withLabMode(getBugs(fixed));
  const api = fixed ? '/api-fixed/checkout' : '/api/checkout';
  const maxQuantity = bug.plusAtMax ? RULES.buggyMaxQuantity : RULES.maxQuantity;
  const phoneRe = bug.phoneShort ? buggyPhonePattern : phonePattern(RULES.phoneDigits);

  const [cart, setCart] = useState<CartLine[]>(checkout.initialCart);
  const [delivery, setDelivery] = useState<DeliveryMethod>(DEFAULT_DELIVERY);
  const [pricedDelivery, setPricedDelivery] = useState<DeliveryMethod>(DEFAULT_DELIVERY);
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [pricedPromo, setPricedPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<CheckoutOrder | null>(null);
  const submittingRef = useRef(false);
  const latestQuote = useRef(0);

  useEffect(() => {
    latestQuote.current += 1;
    const requestNo = latestQuote.current;
    const load = async (): Promise<void> => {
      const result = await postJson<Quote>(`${api}/quote`, { items: cart, delivery: pricedDelivery, promoCode: pricedPromo });
      if (requestNo !== latestQuote.current) return; // a newer change is already being priced
      if (result.ok) {
        setQuote(result.data);
        setQuoteError(null);
      } else setQuoteError(result.message);
    };
    void load();
  }, [api, cart, pricedDelivery, pricedPromo]);

  const changeQuantity = (productId: number, step: number) => {
    setCart((lines) => lines.map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + step } : l)));
  };

  const chooseDelivery = (method: DeliveryMethod) => {
    setDelivery(method);
    if (!bug.staleDelivery) setPricedDelivery(method);
  };

  const applyPromo = async () => {
    const code = promoInput.trim();
    if (code === '') {
      setPromoError(MSG.promoEmpty);
      return;
    }
    const result = await postJson<Quote>(`${api}/quote`, { items: cart, delivery: pricedDelivery, promoCode: code });
    if (!result.ok) {
      setPromoError(result.message);
      return;
    }
    setPromoError(null);
    setAppliedPromo(result.data.promoCode);
    setPricedPromo(result.data.promoCode);
    setPromoInput('');
  };

  const removePromo = () => {
    setAppliedPromo(null);
    if (!bug.promoRemoveStale) setPricedPromo(null);
  };

  const needsAddress = delivery !== 'pickup' || bug.addressForPickup;

  const placeOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (submittingRef.current && !bug.doubleSubmit) return;
    const found = validateContact(contact, needsAddress, phoneRe);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    submittingRef.current = true;
    setSubmitting(true);
    setOrderError(null);
    const customer = { ...contact, address: needsAddress ? contact.address : undefined };
    const result = await postJson<CheckoutOrder>(`${api}/orders`, { items: cart, delivery, promoCode: appliedPromo, customer });
    submittingRef.current = false;
    setSubmitting(false);
    if (result.ok) setPlaced(result.data);
    else setOrderError(`Could not place the order: ${result.message}`);
  };

  const reset = () => {
    setCart(checkout.initialCart);
    setDelivery(DEFAULT_DELIVERY);
    setPricedDelivery(DEFAULT_DELIVERY);
    setPromoInput('');
    setAppliedPromo(null);
    setPricedPromo(null);
    setPromoError(null);
    setContact(EMPTY_CONTACT);
    setErrors({});
    setOrderError(null);
    setPlaced(null);
  };

  const requirements = (
    <>
      <li>
        <b>Cart</b>: quantity {RULES.minQuantity}–{RULES.maxQuantity} per product — “−” is disabled at {RULES.minQuantity}, “+” at {RULES.maxQuantity}. The server
        re-prices the order summary after every change.
      </li>
      <li>
        <b>Delivery</b>: Pickup in store — free; Post office — {formatUah(DELIVERY.post.fee)}; Courier — {formatUah(DELIVERY.courier.fee)}, <b>free for orders from{' '}
        {formatUah(RULES.freeCourierFrom)}</b> (subtotal before discount). The address field is shown only for Post office and Courier.
      </li>
      <li>
        <b>Promo codes</b> (one at a time, any letter case): <code>WELCOME5</code> — {RULES.welcomePercent} % off the subtotal, rounded down (delivery is not
        discounted); <code>MINUS200</code> — {formatUah(RULES.minus200Amount)} off orders from {formatUah(RULES.minus200MinSubtotal)}. Unknown code → “Unknown promo
        code”. <b>Remove</b> → the discount disappears.
      </li>
      <li>
        <b>Contact details</b>: full name {RULES.nameMinLength}–{RULES.nameMaxLength} characters; phone <code>+380</code> and {RULES.phoneDigits} digits (e.g.{' '}
        <code>+380671234567</code>); city from the list; address required for Post office and Courier.
      </li>
      <li>
        <b>Place order</b> is disabled while the order is processing: one click = one order. The confirmation shows the order number and the <b>same total</b> as the
        order summary.
      </li>
      <li>
        <b>Track an order</b>: order number + the phone used at checkout. Any other phone → “Order not found”.
      </li>
      <li>
        API: <code>POST /api/checkout/quote</code>, <code>POST /api/checkout/orders</code>, <code>GET</code> / <code>DELETE /api/checkout/orders/:id?phone=</code>,{' '}
        <code>GET /api/checkout/products</code>.
      </li>
    </>
  );

  return (
    <PlaygroundShell brand="gadgetly" fixed={fixed} requirements={requirements} onReset={reset}>
      <h1 className="text-2xl font-bold">Checkout</h1>
      {placed ? (
        <Confirmation order={placed} showSubtotal={bug.confirmationSubtotal} onNew={reset} />
      ) : (
        <form onSubmit={(e) => void placeOrder(e)} noValidate className="mt-5 space-y-6">
          <section aria-label="Cart" className="rounded-lg border border-slate-200">
            <h2 className="border-b border-slate-200 px-4 py-2 font-semibold">Your cart</h2>
            <ul className="divide-y divide-slate-100">
              {cart.map((line) => (
                <CartRow
                  key={line.productId}
                  line={line}
                  unitPrice={PRODUCTS.find((p) => p.id === line.productId)?.price ?? 0}
                  canDecrease={line.quantity > RULES.minQuantity}
                  canIncrease={line.quantity < maxQuantity}
                  onChange={changeQuantity}
                />
              ))}
            </ul>
          </section>

          <fieldset className="rounded-lg border border-slate-200 p-4">
            <legend className="px-1 font-semibold">Delivery method</legend>
            <div className="space-y-2">
              {DELIVERY_METHODS.map((method) => (
                <label key={method} className="flex items-center gap-2 text-[15px]">
                  <input type="radio" name="delivery" value={method} checked={delivery === method} onChange={() => chooseDelivery(method)} />
                  {deliveryOptionLabel(method)}
                </label>
              ))}
            </div>
          </fieldset>

          <section aria-label="Contact details" className="grid gap-4 sm:grid-cols-2">
            <PgField id="name" label="Full name" error={errors.name}>
              <input id="name" className={inputClass(Boolean(errors.name))} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
            </PgField>
            <PgField id="phone" label="Phone" error={errors.phone}>
              <input
                id="phone"
                type="tel"
                placeholder="+380671234567"
                className={inputClass(Boolean(errors.phone))}
                value={contact.phone}
                onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              />
            </PgField>
            <PgField id="city" label="City">
              <select id="city" className={inputClass(false)} value={contact.city} onChange={(e) => setContact({ ...contact, city: e.target.value })}>
                {checkout.cities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </PgField>
            {needsAddress && (
              <PgField id="address" label="Address" error={errors.address}>
                <input
                  id="address"
                  className={inputClass(Boolean(errors.address))}
                  value={contact.address}
                  onChange={(e) => setContact({ ...contact, address: e.target.value })}
                />
              </PgField>
            )}
          </section>

          <section aria-label="Promo" className="rounded-lg border border-slate-200 p-4">
            {appliedPromo ? (
              <div className="flex items-center gap-3 text-sm" data-testid="promo-applied">
                <span className="rounded bg-emerald-100 px-2 py-1 font-medium text-emerald-800">{appliedPromo} applied</span>
                <button type="button" onClick={removePromo} className="text-slate-600 underline" aria-label="Remove promo code">
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label htmlFor="promo" className="mb-1 block text-sm font-medium text-slate-700">
                    Promo code
                  </label>
                  <input id="promo" className={inputClass(Boolean(promoError))} value={promoInput} onChange={(e) => setPromoInput(e.target.value)} />
                </div>
                <button type="button" onClick={() => void applyPromo()} className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
                  Apply
                </button>
              </div>
            )}
            <FieldError id="promo" message={promoError ?? undefined} />
          </section>

          <Summary quote={quote} error={quoteError} />

          {orderError && (
            <p role="alert" data-testid="order-error" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {orderError}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting && !bug.doubleSubmit}
            className="w-full rounded-md bg-orange-500 py-2.5 font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {submitting ? 'Placing order…' : 'Place order'}
          </button>
        </form>
      )}
      <TrackOrder api={api} />
    </PlaygroundShell>
  );
}

interface CartRowProps {
  line: CartLine;
  unitPrice: number;
  canDecrease: boolean;
  canIncrease: boolean;
  onChange: (productId: number, step: number) => void;
}

const STEP = 1;

function CartRow({ line, unitPrice, canDecrease, canIncrease, onChange }: CartRowProps) {
  const name = productName(line.productId);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" data-testid={`cart-line-${line.productId}`}>
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-sm text-slate-500">{formatUah(unitPrice)} each</div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`Decrease ${name}`} disabled={!canDecrease} onClick={() => onChange(line.productId, -STEP)} className="h-8 w-8 rounded border border-slate-300 disabled:opacity-40">
          −
        </button>
        <span className="w-6 text-center" data-testid={`qty-${line.productId}`}>
          {line.quantity}
        </span>
        <button type="button" aria-label={`Increase ${name}`} disabled={!canIncrease} onClick={() => onChange(line.productId, STEP)} className="h-8 w-8 rounded border border-slate-300 disabled:opacity-40">
          +
        </button>
        <span className="w-28 text-right font-medium">{formatUah(unitPrice * line.quantity)}</span>
      </div>
    </li>
  );
}

function Summary({ quote, error }: { quote: Quote | null; error: string | null }) {
  const rows: { id: string; label: string; value: string }[] = quote
    ? [
        { id: 'subtotal', label: 'Subtotal', value: formatUah(quote.subtotal) },
        { id: 'discount', label: 'Discount', value: quote.discount > 0 ? `-${formatUah(quote.discount)}` : '—' },
        { id: 'delivery', label: 'Delivery', value: feeText(quote.deliveryFee) },
      ]
    : [];
  return (
    <section aria-label="Order summary" className="rounded-lg bg-slate-50 p-4">
      <h2 className="font-semibold">Order summary</h2>
      {error && (
        <p role="alert" data-testid="quote-error" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <dl className="mt-2 space-y-1 text-[15px]">
        {rows.map((r) => (
          <div key={r.id} className="flex justify-between">
            <dt>{r.label}</dt>
            <dd data-testid={`summary-${r.id}`}>{r.value}</dd>
          </div>
        ))}
        <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-bold">
          <dt>Total</dt>
          <dd data-testid="summary-total">{quote ? formatUah(quote.total) : '…'}</dd>
        </div>
      </dl>
    </section>
  );
}

function Confirmation({ order, showSubtotal, onNew }: { order: CheckoutOrder; showSubtotal: boolean; onNew: () => void }) {
  const total = showSubtotal ? order.subtotal : order.total;
  return (
    <section data-testid="confirmation" className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
      <h2 className="text-xl font-semibold text-emerald-900">Thank you, {order.customer.name}!</h2>
      <p className="mt-2">
        Your order <b data-testid="order-number">#{order.id}</b> is placed. Delivery: {DELIVERY[order.delivery].label}.
      </p>
      <p className="mt-1">
        Total: <b data-testid="confirmation-total">{formatUah(total)}</b>
      </p>
      <p className="mt-1 text-sm text-slate-600">Track it any time with the order number and your phone.</p>
      <button type="button" onClick={onNew} className="mt-4 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50">
        Start a new order
      </button>
    </section>
  );
}

type TrackState = { kind: 'idle' } | { kind: 'found'; order: CheckoutOrder } | { kind: 'error'; message: string };

function TrackOrder({ api }: { api: string }) {
  const [number, setNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<TrackState>({ kind: 'idle' });

  const track = async (e: FormEvent) => {
    e.preventDefault();
    const id = number.trim().replace('#', '');
    const result = await callApi<CheckoutOrder>(`${api}/orders/${encodeURIComponent(id)}?phone=${encodeURIComponent(phone.trim())}`);
    setState(result.ok ? { kind: 'found', order: result.data } : { kind: 'error', message: MSG.notFound });
  };

  return (
    <section aria-label="Track an order" className="mt-8 border-t border-slate-200 pt-5">
      <h2 className="font-semibold">Track an order</h2>
      <form onSubmit={(e) => void track(e)} className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="track-number" className="mb-1 block text-sm font-medium text-slate-700">
            Order number
          </label>
          <input id="track-number" className={inputClass(false)} value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>
        <div>
          <label htmlFor="track-phone" className="mb-1 block text-sm font-medium text-slate-700">
            Phone used at checkout
          </label>
          <input id="track-phone" type="tel" className={inputClass(false)} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <button type="submit" className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900">
          Track
        </button>
      </form>
      {state.kind === 'found' && (
        <p data-testid="track-result" className="mt-3 text-sm">
          Order #{state.order.id} — {state.order.status} — total {formatUah(state.order.total)}
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
