import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { PlaygroundShell, PgField, inputClass, isFixedMode, withLabMode } from './PlaygroundShell';

/**
 * Bug Playground: Gadgetly "My account" — a signed-in area for the Playwright practice module (16): dialogs
 * (confirm / prompt / alert), an iframe help chat, a link that opens a new tab, a session kept in localStorage
 * and orders loaded from the local Gadgetly API (GET /api/orders) for network mocking.
 * 8 INTENTIONAL bugs below (helpEmpty lives in HelpWidgetPage). Open with `?fixed` for the correct version.
 * Keep the flags in sync with `bugIds` in registry.ts and with the Playwright tasks that use them.
 */

const API = '/api';
const TOKEN_KEY = 'gadgetly:token';

function getBugs(fixed: boolean) {
  const on = !fixed;
  return {
    sessionLost: on, // the saved session is not restored after a reload
    signOutKeepsToken: on, // Sign out leaves the token in localStorage: after a reload you are signed in again
    renameEmpty: on, // Rename accepts an empty display name
    deleteIgnoresCancel: on, // "Delete account" deletes the account even when the confirmation is cancelled
    termsSameTab: on, // "Terms of Service" opens in the same tab instead of a new one
    ordersErrorAsEmpty: on, // a failed orders request is shown as "No orders yet" instead of an error
    retryNoop: on, // "Try again" after an orders error does nothing
  };
}
type Bugs = ReturnType<typeof getBugs>;

const MSG = {
  required: 'Email and password are required',
  invalid: 'Invalid email or password',
  failed: 'Something went wrong. Try again later.',
  deleteConfirm: 'Delete your account? This cannot be undone.',
  renamePrompt: 'New display name',
  renameEmpty: 'Display name cannot be empty',
  exportStarted: 'Your data export has started. We will email you a link.',
  ordersFailed: 'Could not load your orders.',
};

interface User {
  email: string;
  name: string;
}

interface OrderView {
  id: number;
  status: string;
  quantity: number;
}

type Session = { kind: 'checking' } | { kind: 'signed-out' } | { kind: 'signed-in'; token: string; user: User } | { kind: 'deleted' };
type Orders = { kind: 'loading' } | { kind: 'ready'; items: OrderView[] } | { kind: 'error' };

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null): void {
  try {
    if (token === null) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable — the demo still works in memory */
  }
}

const authHeaders = (token: string): Record<string, string> => ({ Authorization: `Bearer ${token}` });

async function fetchMe(token: string): Promise<User | null> {
  try {
    const res = await fetch(`${API}/me`, { headers: authHeaders(token) });
    return res.ok ? ((await res.json()) as User) : null;
  } catch {
    return null;
  }
}

async function fetchOrders(token: string): Promise<OrderView[] | null> {
  try {
    const res = await fetch(`${API}/orders`, { headers: authHeaders(token) });
    if (!res.ok) return null;
    const body = (await res.json()) as { items?: OrderView[] };
    return (body.items ?? []).map(({ id, status, quantity }) => ({ id, status, quantity }));
  } catch {
    return null;
  }
}

type LoginResult = { ok: true; token: string; user: User } | { ok: false; message: string };

async function logIn(email: string, password: string): Promise<LoginResult> {
  try {
    const res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (res.ok) {
      const body = (await res.json()) as { token: string; user: User };
      return { ok: true, token: body.token, user: body.user };
    }
    return { ok: false, message: res.status === UNAUTHORIZED ? MSG.invalid : MSG.failed };
  } catch {
    return { ok: false, message: MSG.failed };
  }
}

const UNAUTHORIZED = 401;

export function AccountPage() {
  const fixed = isFixedMode();
  const bug = withLabMode(getBugs(fixed));
  const [session, setSession] = useState<Session>({ kind: 'checking' });

  useEffect(() => {
    const token = bug.sessionLost ? null : readToken();
    if (!token) {
      setSession({ kind: 'signed-out' });
      return;
    }
    const restore = async (): Promise<void> => {
      const user = await fetchMe(token);
      if (user) setSession({ kind: 'signed-in', token, user });
      else {
        writeToken(null);
        setSession({ kind: 'signed-out' });
      }
    };
    void restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signedIn = (token: string, user: User) => {
    writeToken(token);
    setSession({ kind: 'signed-in', token, user });
  };

  const signOut = () => {
    if (!bug.signOutKeepsToken) writeToken(null);
    setSession({ kind: 'signed-out' });
  };

  const reset = () => {
    writeToken(null);
    setSession({ kind: 'signed-out' });
  };

  const requirements = (
    <>
      <li>
        Test account: <code>qa@gadgetly.test</code> / <code>Test1234</code> (the same user as in the Gadgetly API). Wrong credentials → “Invalid email or
        password”.
      </li>
      <li>
        After sign-in the session is <b>remembered</b> (token in localStorage <code>gadgetly:token</code>): reloading the page keeps you signed in.
      </li>
      <li>
        <b>Sign out</b> returns to the sign-in form and forgets the session: after a reload you are still signed out.
      </li>
      <li>
        <b>My orders</b> are loaded from <code>GET /api/orders</code>: “Loading orders…”, then the list or “No orders yet”. If loading fails → “Could not
        load your orders.” with <b>Try again</b>, which loads them again.
      </li>
      <li>
        <b>Rename</b> asks for a new display name. An empty name → “Display name cannot be empty”, the name stays. Cancel → nothing changes.
      </li>
      <li>
        <b>Export my data</b> shows “Your data export has started…”, then “Export requested”.
      </li>
      <li>
        <b>Delete account</b> asks for confirmation. Cancel keeps the account; OK → “Your account has been deleted”.
      </li>
      <li>
        <b>Terms of Service</b> opens in a <b>new tab</b>.
      </li>
      <li>
        <b>Help chat</b> (at the bottom, an embedded frame): the question is required; Send → “Thanks! We'll reply within 24 hours.”
      </li>
    </>
  );

  return (
    <PlaygroundShell brand="gadgetly" fixed={fixed} requirements={requirements} onReset={reset}>
      <SessionView session={session} bug={bug} fixed={fixed} onSignedIn={signedIn} onSignOut={signOut} onDeleted={() => setSession({ kind: 'deleted' })} />
    </PlaygroundShell>
  );
}

function SessionView({
  session,
  bug,
  fixed,
  onSignedIn,
  onSignOut,
  onDeleted,
}: {
  session: Session;
  bug: Bugs;
  fixed: boolean;
  onSignedIn: (token: string, user: User) => void;
  onSignOut: () => void;
  onDeleted: () => void;
}) {
  if (session.kind === 'checking') return <p className="text-slate-500">Checking your session…</p>;
  if (session.kind === 'signed-out') return <SignInForm onSignedIn={onSignedIn} />;
  if (session.kind === 'deleted') {
    return (
      <div role="status" data-testid="account-deleted" className="py-10 text-center">
        <h1 className="text-2xl font-bold">Your account has been deleted</h1>
        <p className="mt-2 text-slate-600">We are sorry to see you go.</p>
      </div>
    );
  }
  return <Dashboard token={session.token} user={session.user} bug={bug} fixed={fixed} onSignOut={onSignOut} onDeleted={onDeleted} />;
}

function SignInForm({ onSignedIn }: { onSignedIn: (token: string, user: User) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!email.trim() || !password) {
      setError(MSG.required);
      return;
    }
    setBusy(true);
    const result = await logIn(email, password);
    setBusy(false);
    if (result.ok) onSignedIn(result.token, result.user);
    else setError(result.message);
  };

  return (
    <form onSubmit={(ev) => void submit(ev)} noValidate data-testid="account-login" className="mx-auto max-w-sm py-4">
      <h1 className="text-2xl font-bold">Sign in to your account</h1>
      <div className="mt-6 space-y-4">
        <PgField id="account-email" label="Email">
          <input id="account-email" type="email" className={inputClass(false)} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </PgField>
        <PgField id="account-password" label="Password">
          <input id="account-password" type="password" className={inputClass(false)} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </PgField>
      </div>
      {error && (
        <p role="alert" data-testid="account-login-error" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="mt-6 w-full rounded-md bg-orange-500 py-2.5 font-semibold text-white hover:bg-orange-600 disabled:opacity-60">
        Sign in
      </button>
    </form>
  );
}

function Dashboard({
  token,
  user,
  bug,
  fixed,
  onSignOut,
  onDeleted,
}: {
  token: string;
  user: User;
  bug: Bugs;
  fixed: boolean;
  onSignOut: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [exported, setExported] = useState(false);

  const rename = () => {
    const next = window.prompt(MSG.renamePrompt, name);
    if (next === null) return;
    if (!next.trim() && !bug.renameEmpty) {
      window.alert(MSG.renameEmpty);
      return;
    }
    setName(bug.renameEmpty ? next : next.trim());
  };

  const exportData = () => {
    window.alert(MSG.exportStarted);
    setExported(true);
  };

  const deleteAccount = () => {
    const confirmed = window.confirm(MSG.deleteConfirm);
    if (!confirmed && !bug.deleteIgnoresCancel) return;
    writeToken(null);
    onDeleted();
  };

  return (
    <div data-testid="account-dashboard">
      <h1 className="text-2xl font-bold">My account</h1>
      <p className="mt-1 text-slate-600" data-testid="account-email">
        Signed in as {user.email}
      </p>

      <section className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-4" aria-label="Profile">
        <div className="text-sm text-slate-500">Display name</div>
        <div className="min-w-[8rem] font-semibold" data-testid="display-name">
          {name}
        </div>
        <button type="button" onClick={rename} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          Rename
        </button>
      </section>

      <OrdersSection token={token} bug={bug} />

      <section className="mt-6 flex flex-wrap items-center gap-2" aria-label="Account actions">
        <button type="button" onClick={exportData} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          Export my data
        </button>
        <button type="button" onClick={deleteAccount} className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">
          Delete account
        </button>
        <button type="button" onClick={onSignOut} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-900">
          Sign out
        </button>
        {exported && (
          <span role="status" data-testid="export-status" className="text-sm text-emerald-700">
            Export requested
          </span>
        )}
      </section>

      <p className="mt-6 text-sm text-slate-500">
        By using Gadgetly you agree to the{' '}
        <a href="/playground/terms" target={bug.termsSameTab ? undefined : '_blank'} rel="noopener noreferrer" className="text-orange-600 underline">
          Terms of Service
        </a>
        .
      </p>

      <iframe
        title="Help chat"
        src={fixed ? '/playground/help-widget?fixed' : '/playground/help-widget'}
        className="mt-6 h-56 w-full rounded-lg border border-slate-200"
      />
    </div>
  );
}

function OrdersSection({ token, bug }: { token: string; bug: Bugs }) {
  const [orders, setOrders] = useState<Orders>({ kind: 'loading' });

  const load = useCallback(async () => {
    setOrders({ kind: 'loading' });
    const items = await fetchOrders(token);
    if (items) setOrders({ kind: 'ready', items });
    else setOrders(bug.ordersErrorAsEmpty ? { kind: 'ready', items: [] } : { kind: 'error' });
  }, [token, bug.ordersErrorAsEmpty]);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = () => {
    if (!bug.retryNoop) void load();
  };

  return (
    <section className="mt-6" aria-labelledby="orders-heading">
      <h2 id="orders-heading" className="text-lg font-semibold">
        My orders
      </h2>
      <OrdersBody orders={orders} onRetry={retry} />
    </section>
  );
}

function OrdersBody({ orders, onRetry }: { orders: Orders; onRetry: () => void }) {
  if (orders.kind === 'loading') return <p className="mt-2 text-sm text-slate-500">Loading orders…</p>;
  if (orders.kind === 'error') {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <p role="alert" data-testid="orders-error" className="text-sm text-red-700">
          {MSG.ordersFailed}
        </p>
        <button type="button" onClick={onRetry} className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50">
          Try again
        </button>
      </div>
    );
  }
  if (orders.items.length === 0) {
    return (
      <p data-testid="orders-empty" className="mt-2 text-sm text-slate-500">
        No orders yet
      </p>
    );
  }
  return (
    <ul data-testid="orders" className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200">
      {orders.items.map((o) => (
        <li key={o.id} className="flex justify-between px-3 py-2 text-sm">
          <span className="font-medium">Order #{o.id}</span>
          <span className="text-slate-500">
            {o.quantity} pcs · {o.status}
          </span>
        </li>
      ))}
    </ul>
  );
}
