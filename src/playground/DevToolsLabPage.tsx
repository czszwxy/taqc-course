import { useEffect, useRef, useState } from 'react';
import { PlaygroundShell, formatUah, inputClass, isFixedMode } from './PlaygroundShell';
import lab from './data/devtools-lab.json';

/**
 * Bug Playground: DevTools Lab — a page made for practising the Elements, Console, Network and
 * Application panels. Some answers exist ONLY in DevTools (hidden inputs, console messages,
 * request bodies, storage). It has 6 INTENTIONAL bugs used by module 07 tasks
 * (content/modules/07-how-the-web-works/lessons/05-…, 06-…, 07-…). Open with `?fixed` to disable them.
 */

const CART_KEY = 'lab:cart';
const WIZARD_KEY = 'lab:wizardStep';
const WIZARD_STEP = '3';
const COOKIE_THEME = 'lab_theme=dark; path=/';
const COOKIE_SESSION = 'lab_session=s-9f2c41; path=/';
const COOKIE_SESSION_EXPIRE = 'lab_session=; path=/; max-age=0';
const COOKIE_THEME_EXPIRE = 'lab_theme=; path=/; max-age=0';
const REPORT_DELAY_MS = 2500;
const MS_PER_SECOND = 1000;
const PHONES_LIMIT = 5;

const PRODUCTS = lab.products;
const CART = lab.cart;
/** Line items used by "Calculate total"; the buggy build reads one item too many. */
const TOTAL_ITEMS = lab.totalItems;

const AVATAR_SVG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><rect width='40' height='40' rx='20' fill='%2314b8a6'/><text x='20' y='26' font-size='16' text-anchor='middle' fill='white' font-family='sans-serif'>OT</text></svg>";

function getBugs(fixed: boolean) {
  const on = !fixed;
  return {
    totalCrash: on, // "Calculate total" throws TypeError (reads items[3])
    promoClientOnly: on, // enabling the disabled Apply button in Elements gives a discount (no server check)
    newsletterFalse: on, // Save profile sends newsletter: false although the box is checked
    ordersFilter: on, // Load orders sends status=all instead of the selected status
    avatar404: on, // avatar is requested from a missing URL (404), the UI silently shows a fallback
    logoutKeepsCart: on, // Log out leaves lab:cart in localStorage
  };
}

let announced = false;

function announce(): void {
  if (announced) return;
  announced = true;
  console.info('[lab] Build: 2.7.1-rc3');
  console.warn('[lab] Deprecated API: /v1/cart will be removed in 3.0');
}

function seedStorage(): void {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(CART));
    sessionStorage.setItem(WIZARD_KEY, WIZARD_STEP);
  } catch {
    /* storage blocked — the lab still renders */
  }
  document.cookie = COOKIE_THEME;
  document.cookie = COOKIE_SESSION;
}

function sumPrices(items: { price: number }[], count: number): number {
  return Array.from({ length: count }, (_, i) => items[i]).reduce((sum, item) => sum + (item as { price: number }).price, 0);
}

declare global {
  interface Window {
    labConfig?: { featureFlags: Record<string, boolean>; apiBase: string };
  }
}

export function DevToolsLabPage() {
  const fixed = isFixedMode();
  const bug = getBugs(fixed);
  const base = fixed ? '/api-fixed' : '/api';

  const [totalMessage, setTotalMessage] = useState<string | null>(null);
  const [promo, setPromo] = useState('');
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [phones, setPhones] = useState<string[] | null>(null);
  const [name, setName] = useState('Olena');
  const [newsletter, setNewsletter] = useState(true);
  const [language, setLanguage] = useState('uk');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [orderStatus, setOrderStatus] = useState('paid');
  const [ordersMessage, setOrdersMessage] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [session, setSession] = useState('Signed in as Olena');
  /** The disabled attribute is set on the DOM node (not as a React prop), so removing it in DevTools really enables the button. */
  const promoButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    announce();
    seedStorage();
    window.labConfig = { featureFlags: { newCheckout: false, darkMode: true }, apiBase: base };
    promoButton.current?.setAttribute('disabled', '');
  }, [base]);

  const calculateTotal = (): void => {
    try {
      const count = TOTAL_ITEMS.length + (bug.totalCrash ? 1 : 0);
      setTotalMessage(`Total: ${formatUah(sumPrices(TOTAL_ITEMS, count))}`);
    } catch (err) {
      console.error(err);
      setTotalMessage('Something went wrong. Please try again later.');
    }
  };

  const applyPromo = (): void => {
    setPromoMessage(bug.promoClientOnly ? 'Discount applied: −50% 🎉' : 'Server rejected the request (403): guests cannot use promo codes.');
  };

  const loadPhones = async (): Promise<void> => {
    const res = await fetch(`${base}/products?category=Phones&limit=${PHONES_LIMIT}`);
    const json = (await res.json()) as { items: { name: string }[] };
    setPhones(json.items.map((p) => p.name));
  };

  const saveProfile = async (): Promise<void> => {
    const payload = { name, newsletter: bug.newsletterFalse ? false : newsletter, language };
    const res = await fetch(`${base}/lab/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setProfileMessage(res.ok ? 'Profile saved ✓' : 'Could not save the profile');
  };

  const loadAvatar = (): void => {
    setAvatar(bug.avatar404 ? `${base}/lab/avatar.png` : AVATAR_SVG);
  };

  const loadOrders = async (): Promise<void> => {
    const status = bug.ordersFilter ? 'all' : orderStatus;
    await fetch(`${base}/lab/orders?status=${status}&page=1`);
    setOrdersMessage(`No ${orderStatus} orders found.`);
  };

  const generateReport = async (): Promise<void> => {
    setReport('Generating…');
    await fetch(`${base}/slow?ms=${REPORT_DELAY_MS}`);
    setReport(`Report ready (${REPORT_DELAY_MS / MS_PER_SECOND} s).`);
  };

  const logOut = (): void => {
    document.cookie = COOKIE_SESSION_EXPIRE;
    try {
      sessionStorage.removeItem(WIZARD_KEY);
      if (!bug.logoutKeepsCart) localStorage.removeItem(CART_KEY);
    } catch {
      /* ignore */
    }
    setSession('Signed out');
  };

  const reset = (): void => {
    seedStorage();
    setSession('Signed in as Olena');
    setTotalMessage(null);
    setPromoMessage(null);
    setPhones(null);
    setProfileMessage(null);
    setAvatar(null);
    setAvatarFailed(false);
    setOrdersMessage(null);
    setReport(null);
    setNewsletter(true);
  };

  const clearTheme = (): void => {
    document.cookie = COOKIE_THEME_EXPIRE;
  };

  const requirements = (
    <>
      <li>Open DevTools with F12 (or Ctrl+Shift+I). Most answers on this page are visible only there.</li>
      <li>
        <b>Calculate total</b> shows the sum of the 3 line items.
      </li>
      <li>
        <b>Apply promo</b> is disabled for guests, and the server must also reject promo codes from guests.
      </li>
      <li>
        <b>Save profile</b> sends exactly what the form shows: <code>name</code>, <code>newsletter</code>, <code>language</code>.
      </li>
      <li>
        <b>Load orders</b> sends the selected status filter.
      </li>
      <li>
        <b>Load avatar</b> loads the user's picture without failed requests.
      </li>
      <li>
        <b>Log out</b> removes the session cookie and all <code>lab:*</code> data from Local and Session storage.
      </li>
    </>
  );

  const card = 'rounded-lg border border-slate-200 p-4';
  const button = 'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50';

  return (
    <PlaygroundShell brand="taskly" fixed={fixed} requirements={requirements} onReset={reset} asideTitle="Lab notes & requirements">
      <h1 className="text-2xl font-bold">DevTools Lab</h1>
      <p className="mt-1 text-sm text-slate-500">A practice page for the browser developer tools. {session}.</p>

      <section className={`${card} mt-5`} data-testid="lab-elements">
        <h2 className="font-semibold">1. Elements</h2>
        <input type="hidden" name="csrf_token" value="QA-4821" />
        <p className="promo-secret" style={{ display: 'none' }}>
          Secret promo code: HIDDEN-SALE-25
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3" data-testid="lab-products">
          {PRODUCTS.map((p) => (
            <li key={p.name} className="product-card rounded-md bg-slate-50 p-2 text-sm" data-testid="product-card">
              <div className="font-medium">{p.name}</div>
              <div className="text-slate-500">{formatUah(p.price)}</div>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor="lab-promo" className="text-sm">
            Promo code
          </label>
          <input id="lab-promo" className={`${inputClass(false)} w-44`} value={promo} onChange={(e) => setPromo(e.target.value)} />
          <button ref={promoButton} type="button" id="apply-promo" data-testid="apply-promo" onClick={applyPromo} className={`${button} disabled:cursor-not-allowed disabled:opacity-50`}>
            Apply promo
          </button>
          <span className="text-xs text-slate-400">Sign in to use promo codes</span>
        </div>
        {promoMessage && (
          <p role="status" className="mt-2 text-sm font-medium" data-testid="promo-message">
            {promoMessage}
          </p>
        )}
      </section>

      <section className={`${card} mt-4`} data-testid="lab-console">
        <h2 className="font-semibold">2. Console</h2>
        <p className="mt-1 text-sm text-slate-500">
          This page writes messages to the Console when it loads. Try typing <code>labConfig</code> there.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" data-testid="calculate-total" onClick={calculateTotal} className={button}>
            Calculate total
          </button>
          {totalMessage && (
            <span role="status" className="text-sm" data-testid="total-message">
              {totalMessage}
            </span>
          )}
        </div>
      </section>

      <section className={`${card} mt-4`} data-testid="lab-network">
        <h2 className="font-semibold">3. Network</h2>
        <div className="mt-3 space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" data-testid="load-phones" onClick={() => void loadPhones()} className={button}>
              Load phones
            </button>
            {phones && <span data-testid="phones">{phones.length} phones: {phones.join(', ')}</span>}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="lab-name" className="mb-1 block text-xs text-slate-500">
                Name
              </label>
              <input id="lab-name" className={`${inputClass(false)} w-40`} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 pb-2">
              <input type="checkbox" data-testid="newsletter" className="h-4 w-4 accent-teal-600" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} />
              Subscribe to newsletter
            </label>
            <div>
              <label htmlFor="lab-language" className="mb-1 block text-xs text-slate-500">
                Language
              </label>
              <select id="lab-language" className={`${inputClass(false)} w-32`} value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="uk">Українська</option>
                <option value="en">English</option>
              </select>
            </div>
            <button type="button" data-testid="save-profile" onClick={() => void saveProfile()} className={button}>
              Save profile
            </button>
            {profileMessage && <span data-testid="profile-message">{profileMessage}</span>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" data-testid="load-avatar" onClick={loadAvatar} className={button}>
              Load avatar
            </button>
            {avatar && (
              <img
                src={avatarFailed ? AVATAR_SVG : avatar}
                alt="User avatar"
                width={40}
                height={40}
                className="h-10 w-10 rounded-full bg-teal-500"
                onError={() => setAvatarFailed(true)}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="lab-order-status">Status</label>
            <select id="lab-order-status" className={`${inputClass(false)} w-32`} value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}>
              <option value="paid">Paid</option>
              <option value="shipped">Shipped</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button type="button" data-testid="load-orders" onClick={() => void loadOrders()} className={button}>
              Load orders
            </button>
            {ordersMessage && <span data-testid="orders-message">{ordersMessage}</span>}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" data-testid="generate-report" onClick={() => void generateReport()} className={button}>
              Generate report
            </button>
            {report && <span data-testid="report">{report}</span>}
          </div>
        </div>
      </section>

      <section className={`${card} mt-4`} data-testid="lab-application">
        <h2 className="font-semibold">4. Application (storage)</h2>
        <p className="mt-1 text-sm text-slate-500">
          This page keeps a cart, a wizard step and two cookies in the browser. Find them in DevTools → Application.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" data-testid="log-out" onClick={logOut} className={button}>
            Log out
          </button>
          <button type="button" data-testid="clear-theme" onClick={clearTheme} className={button}>
            Forget theme
          </button>
        </div>
      </section>
    </PlaygroundShell>
  );
}
