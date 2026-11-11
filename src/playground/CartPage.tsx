import { useState, type FormEvent } from 'react';
import { PlaygroundShell, FieldError, formatUah, inputClass, isFixedMode, withLabMode } from './PlaygroundShell';
import cartData from './data/cart.json';

/**
 * Bug Playground: Gadgetly shopping cart with 6 INTENTIONAL bugs (catalogued in
 * content/modules/06-qa-practice-lab/lessons/05-shopping-cart/tasks/03-bug-hunt/task.json).
 * Open with `?fixed` for the correct implementation. Keep this file and the bug catalog in sync.
 */

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

type PromoCode = 'SAVE10' | 'FREESHIP';
interface AppliedPromo {
  code: PromoCode;
  /** How many times the code was applied (must never exceed 1 in a correct cart). */
  times: number;
}

const RULES = cartData.rules;
const INITIAL_ITEMS: CartItem[] = cartData.items;
const PERCENT = 100;
const PROMO_CODES: readonly string[] = ['SAVE10', 'FREESHIP'];

function getBugs(fixed: boolean) {
  const on = !fixed;
  return {
    qtyZero: on, // quantity 0 is accepted
    promoCase: on, // promo codes are case-sensitive
    shippingBoundary: on, // subtotal of exactly 3,000 still pays shipping (> instead of >=)
    removeLast: on, // "Remove" deletes the last item instead of the clicked one
    promoTwice: on, // applying SAVE10 again doubles the discount
    memberWithPromo: on, // Plus member loses free shipping when SAVE10 is applied
  };
}
type Bugs = ReturnType<typeof getBugs>;

function isValidQty(text: string, bug: Bugs): boolean {
  const n = Number(text);
  const min = bug.qtyZero ? 0 : RULES.minQty;
  return text.trim() !== '' && Number.isInteger(n) && n >= min && n <= RULES.maxQty;
}

function parsePromo(raw: string, bug: Bugs): PromoCode | null {
  const cleaned = raw.trim();
  const code = bug.promoCase ? cleaned : cleaned.toUpperCase();
  return PROMO_CODES.includes(code) ? (code as PromoCode) : null;
}

function applyPromo(current: AppliedPromo | null, code: PromoCode, bug: Bugs): AppliedPromo {
  const sameAgain = current?.code === code && code === 'SAVE10' && bug.promoTwice;
  return { code, times: sameAgain ? current.times + 1 : 1 };
}

interface Totals {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}

function computeTotals(items: CartItem[], promo: AppliedPromo | null, member: boolean, bug: Bugs): Totals {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const percent = promo?.code === 'SAVE10' ? RULES.save10Percent * promo.times : 0;
  const discount = Math.round((subtotal * percent) / PERCENT);
  const overThreshold = bug.shippingBoundary ? subtotal > RULES.freeShippingFrom : subtotal >= RULES.freeShippingFrom;
  const memberCounts = member && !(bug.memberWithPromo && promo?.code === 'SAVE10');
  const freeShipping = items.length === 0 || overThreshold || promo?.code === 'FREESHIP' || memberCounts;
  const shipping = freeShipping ? 0 : RULES.shippingFee;
  return { subtotal, discount, shipping, total: subtotal - discount + shipping };
}

function freshQtyInputs(items: CartItem[]): Record<string, string> {
  return Object.fromEntries(items.map((i) => [i.id, String(i.qty)]));
}

export function CartPage() {
  const fixed = isFixedMode();
  const bug = withLabMode(getBugs(fixed));

  const [items, setItems] = useState<CartItem[]>(INITIAL_ITEMS);
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>(() => freshQtyInputs(INITIAL_ITEMS));
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [member, setMember] = useState(false);
  const [placed, setPlaced] = useState<number | null>(null);

  const totals = computeTotals(items, promo, member, bug);

  const changeQty = (id: string, text: string) => {
    setQtyInputs((prev) => ({ ...prev, [id]: text }));
    if (isValidQty(text, bug)) setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Number(text) } : i)));
  };

  const remove = (id: string) => {
    setItems((prev) => (bug.removeLast ? prev.slice(0, -1) : prev.filter((i) => i.id !== id)));
  };

  const submitPromo = (ev: FormEvent) => {
    ev.preventDefault();
    const code = parsePromo(promoInput, bug);
    if (!code) {
      setPromoError('Promo code is not valid');
      return;
    }
    setPromoError(null);
    setPromo((current) => applyPromo(current, code, bug));
  };

  const reset = () => {
    setItems(INITIAL_ITEMS);
    setQtyInputs(freshQtyInputs(INITIAL_ITEMS));
    setPromoInput('');
    setPromo(null);
    setPromoError(null);
    setMember(false);
    setPlaced(null);
  };

  const requirements = (
    <>
      <li>
        <b>Quantity</b>: whole number from <b>1 to 10</b>. Invalid value → “Quantity must be from 1 to 10” under the item; totals do not change. To
        delete an item use <b>Remove</b>.
      </li>
      <li>
        <b>Remove</b> deletes exactly the item in its row.
      </li>
      <li>Line total = price × quantity. Subtotal = sum of line totals.</li>
      <li>
        Promo codes (case-insensitive, spaces ignored): <code>SAVE10</code> — 10% off the subtotal; <code>FREESHIP</code> — free shipping.
        Only <b>one</b> code per order: applying a code again or applying another code never stacks discounts.
      </li>
      <li>
        <b>Shipping</b>: 100 UAH. <b>Free</b> if the subtotal is <b>3,000 UAH or more</b>, OR the customer is a <b>Gadgetly Plus</b> member, OR{' '}
        <code>FREESHIP</code> is applied. Each condition works on its own and together with any promo code.
      </li>
      <li>Total = subtotal − discount + shipping.</li>
      <li>Empty cart → “Your cart is empty”, Checkout is disabled.</li>
    </>
  );

  if (placed !== null) {
    return (
      <PlaygroundShell brand="gadgetly" fixed={fixed} requirements={requirements} onReset={reset}>
        <div role="status" data-testid="order-placed" className="py-10 text-center">
          <div className="text-4xl">📦</div>
          <h1 className="mt-3 text-2xl font-bold">Order placed!</h1>
          <p className="mt-2 text-slate-600">You paid {formatUah(placed)} (demo — no real payment).</p>
          <button type="button" onClick={reset} className="mt-6 rounded-md bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600">
            Start again
          </button>
        </div>
      </PlaygroundShell>
    );
  }

  return (
    <PlaygroundShell brand="gadgetly" fixed={fixed} requirements={requirements} onReset={reset}>
      <h1 className="text-2xl font-bold">Your cart</h1>

      {items.length === 0 ? (
        <p data-testid="cart-empty" className="mt-6 rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Your cart is empty
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-slate-200" data-testid="cart-items">
          {items.map((item) => {
            const qtyText = qtyInputs[item.id] ?? String(item.qty);
            const qtyError = isValidQty(qtyText, bug) ? undefined : `Quantity must be from ${RULES.minQty} to ${RULES.maxQty}`;
            return (
              <li key={item.id} data-testid={`cart-item-${item.id}`} className="flex flex-wrap items-start gap-4 py-4">
                <div className="min-w-[10rem] flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-slate-500">{formatUah(item.price)} each</div>
                </div>
                <div className="w-24">
                  <label htmlFor={`qty-${item.id}`} className="sr-only">
                    Quantity of {item.name}
                  </label>
                  <input
                    id={`qty-${item.id}`}
                    type="number"
                    data-testid={`qty-${item.id}`}
                    className={inputClass(Boolean(qtyError))}
                    value={qtyText}
                    onChange={(e) => changeQty(item.id, e.target.value)}
                  />
                  <FieldError id={`qty-${item.id}`} message={qtyError} />
                </div>
                <div className="w-28 pt-2 text-right font-semibold" data-testid={`line-total-${item.id}`}>
                  {formatUah(item.price * item.qty)}
                </div>
                <button type="button" data-testid={`remove-${item.id}`} onClick={() => remove(item.id)} className="pt-2 text-sm text-red-600 hover:underline">
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <form onSubmit={submitPromo} noValidate data-testid="promo-form">
            <label htmlFor="promo" className="mb-1 block text-sm font-medium text-slate-700">
              Promo code
            </label>
            <div className="flex gap-2">
              <input id="promo" data-testid="promo-input" className={inputClass(Boolean(promoError))} value={promoInput} onChange={(e) => setPromoInput(e.target.value)} />
              <button type="submit" data-testid="promo-apply" className="rounded-md border border-slate-300 px-4 font-medium hover:bg-slate-50">
                Apply
              </button>
            </div>
            <FieldError id="promo" message={promoError ?? undefined} />
            {promo && (
              <p data-testid="promo-applied" className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800">
                {promo.code} applied
                <button type="button" aria-label="Remove promo code" data-testid="promo-remove" onClick={() => setPromo(null)} className="font-bold">
                  ×
                </button>
              </p>
            )}
          </form>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" data-testid="plus-member" className="h-4 w-4 accent-orange-500" checked={member} onChange={(e) => setMember(e.target.checked)} />
            <span>
              I'm a <b>Gadgetly Plus</b> member (free shipping)
            </span>
          </label>
        </div>

        <dl className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm" data-testid="cart-summary">
          <SummaryRow label="Subtotal" value={formatUah(totals.subtotal)} testId="subtotal" />
          <SummaryRow label="Discount" value={totals.discount ? `− ${formatUah(totals.discount)}` : '—'} testId="discount" />
          <SummaryRow label="Shipping" value={totals.shipping ? formatUah(totals.shipping) : 'Free'} testId="shipping" />
          <div className="border-t border-slate-200 pt-2">
            <SummaryRow label="Total" value={formatUah(totals.total)} testId="total" strong />
          </div>
          <button
            type="button"
            data-testid="checkout"
            disabled={items.length === 0}
            onClick={() => setPlaced(totals.total)}
            className="mt-3 w-full rounded-md bg-orange-500 py-2.5 font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Checkout
          </button>
        </dl>
      </div>
    </PlaygroundShell>
  );
}

function SummaryRow({ label, value, testId, strong }: { label: string; value: string; testId: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? 'text-base font-bold' : ''}`}>
      <dt>{label}</dt>
      <dd data-testid={testId}>{value}</dd>
    </div>
  );
}
