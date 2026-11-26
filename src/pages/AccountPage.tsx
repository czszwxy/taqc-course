import { useId, useState, type FormEvent, type InputHTMLAttributes, type ReactElement, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Callout } from '../components/ui';
import { Icon } from '../components/icons';
import { useProgress } from '../features/progress/store';
import { ago } from '../features/sync/SyncSection';
import { ACCOUNTS_ENABLED } from '../features/account/client';
import { AccountError, accountSyncNow, useAccount, type AccountUser } from '../features/account/accountSync';
import { signIn, signOut, signUp } from '../features/account/auth';
import { LOGIN_RULE, MIN_PASSWORD_LENGTH, validateSignIn, validateSignUp, type FieldErrors, type SignUpForm } from '../features/account/rules';

/** `/account`: sign in, create an account (with email or login only), or — signed in — the account and its sync. */

const EMPTY_FORM: SignUpForm = { firstName: '', lastName: '', login: '', email: '', password: '', repeat: '', withEmail: true };
const CHECK_FIELDS = 'Check the highlighted fields.';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: ReactNode };

function Field({ label, error, hint, ...input }: FieldProps): ReactElement {
  const id = useId();
  const described = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ');
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input id={id} className={`input ${error ? 'border-bad' : ''}`} aria-invalid={Boolean(error)} aria-describedby={described || undefined} {...input} />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs font-bold text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

function FormError({ message }: { message: string | null }): ReactElement | null {
  if (!message) return null;
  return (
    <div role="alert">
      <Callout tone="bad">{message}</Callout>
    </div>
  );
}

/** Field errors from a thrown error, or the error as a message above the form. */
function showError(e: unknown, setErrors: (errors: FieldErrors) => void, setFormError: (message: string) => void): void {
  if (e instanceof AccountError && e.field) {
    setErrors({ [e.field]: e.message });
    return;
  }
  setFormError(e instanceof Error ? e.message : String(e));
}

function DeviceProgressBox({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }): ReactElement | null {
  const hasProgress = useProgress((s) => Object.keys(s.tasks).length + Object.keys(s.theoryRead).length > 0);
  if (!hasProgress) return null;
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        Add this browser's progress to my account
        <span className="block text-xs text-muted">Leave it unticked on someone else's device. Signing out brings this browser's progress back.</span>
      </span>
    </label>
  );
}

function SignInForm({ presetLogin }: { presetLogin?: string }): ReactElement {
  const [identifier, setIdentifier] = useState(presetLogin ?? '');
  const [password, setPassword] = useState('');
  const [addDevice, setAddDevice] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setFormError(null);
    const found = validateSignIn(identifier, password);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      await signIn(identifier, password, addDevice);
    } catch (err) {
      showError(err, setErrors, setFormError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={(e) => void submit(e)} noValidate>
      <FormError message={formError} />
      <Field
        label="Login or email"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        value={identifier}
        readOnly={Boolean(presetLogin)}
        onChange={(e) => setIdentifier(e.target.value)}
        error={errors.identifier}
      />
      <Field label="Password" type="password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
      {!presetLogin && <DeviceProgressBox checked={addDevice} onChange={setAddDevice} />}
      <button className="btn btn-primary w-full justify-center" type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

function SignUpFormView(): ReactElement {
  const [form, setForm] = useState<SignUpForm>(EMPTY_FORM);
  const [addDevice, setAddDevice] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (part: Partial<SignUpForm>): void => setForm((f) => ({ ...f, ...part }));

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setFormError(null);
    const found = validateSignUp(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFormError(CHECK_FIELDS);
      return;
    }
    setBusy(true);
    try {
      await signUp(form, addDevice);
    } catch (err) {
      showError(err, setErrors, setFormError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={(e) => void submit(e)} noValidate>
      <FormError message={formError} />
      <fieldset>
        <legend className="label">Sign up with</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            { withEmail: true, label: 'Email' },
            { withEmail: false, label: 'Login only' },
          ].map((option) => (
            <label
              key={option.label}
              className={`btn justify-center has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${form.withEmail === option.withEmail ? 'btn-primary' : 'btn-secondary'}`}
            >
              <input type="radio" name="way" className="sr-only" checked={form.withEmail === option.withEmail} onChange={() => set({ withEmail: option.withEmail })} />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" name="given-name" autoComplete="given-name" value={form.firstName} onChange={(e) => set({ firstName: e.target.value })} error={errors.firstName} />
        <Field label="Last name" name="family-name" autoComplete="family-name" value={form.lastName} onChange={(e) => set({ lastName: e.target.value })} error={errors.lastName} />
      </div>
      <Field
        label="Login"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        value={form.login}
        onChange={(e) => set({ login: e.target.value })}
        error={errors.login}
        hint={`${LOGIN_RULE} You can sign in with it.`}
      />
      {form.withEmail && (
        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => set({ email: e.target.value })}
          error={errors.email}
          hint="You can sign in with it too. We never send you mail."
        />
      )}
      <Field
        label="Password"
        type="password"
        name="new-password"
        autoComplete="new-password"
        value={form.password}
        onChange={(e) => set({ password: e.target.value })}
        error={errors.password}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters. There is no "forgot password" email, so keep it in a password manager.`}
      />
      <Field label="Repeat password" type="password" name="repeat-password" autoComplete="new-password" value={form.repeat} onChange={(e) => set({ repeat: e.target.value })} error={errors.repeat} />
      <DeviceProgressBox checked={addDevice} onChange={setAddDevice} />
      <button className="btn btn-primary w-full justify-center" type="submit" disabled={busy}>
        {busy ? 'Creating your account…' : 'Create account'}
      </button>
    </form>
  );
}

function SignedIn({ user }: { user: AccountUser }): ReactElement {
  const { status, error, errorKind, lastSyncedAt } = useAccount();
  const [busy, setBusy] = useState(false);
  const sessionEnded = status === 'error' && errorKind === 'session';

  const leave = async (): Promise<void> => {
    setBusy(true);
    try {
      const result = await signOut();
      const sure = result === 'unsynced' && confirm('Your latest changes are not saved to your account yet (no connection?). Sign out anyway? They will be removed from this browser.');
      if (sure) await signOut(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className="font-display text-[1.9rem] font-bold">Your account</h1>
      <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">Name</dt>
        <dd className="font-bold [overflow-wrap:anywhere]">
          {user.firstName} {user.lastName}
        </dd>
        <dt className="text-muted">Login</dt>
        <dd className="font-mono [overflow-wrap:anywhere]">{user.login}</dd>
        <dt className="text-muted">Email</dt>
        <dd className="[overflow-wrap:anywhere]">{user.email ?? 'none (signed up with a login only)'}</dd>
      </dl>
      <p className="mt-4 text-sm text-muted" aria-live="polite">
        {status === 'syncing' ? 'Syncing…' : `Progress and settings sync by themselves. Last sync: ${ago(lastSyncedAt)}.`}
      </p>
      {status === 'error' && error && (
        <div className="mt-3" role="alert">
          <Callout tone="bad">{error}</Callout>
        </div>
      )}
      {sessionEnded && (
        <div className="mt-4">
          <SignInForm presetLogin={user.login} />
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn btn-secondary" onClick={() => void accountSyncNow()} disabled={busy || status === 'syncing'}>
          Sync now
        </button>
        <button className="btn btn-ghost" onClick={() => void leave()} disabled={busy}>
          Sign out
        </button>
      </div>
      <p className="mt-4 text-xs text-faint">Signing out removes this account's progress from this browser and brings back what the browser had before.</p>
    </>
  );
}

export function AccountPage(): ReactElement {
  const user = useAccount((s) => s.user);
  const [params, setParams] = useSearchParams();
  const signingUp = params.get('mode') === 'signup';

  if (!ACCOUNTS_ENABLED) {
    return (
      <div className="mx-auto max-w-md px-5 py-8">
        <div className="page p-6">
          <h1 className="font-display text-[1.9rem] font-bold">Accounts</h1>
          <p className="mt-2 text-sm text-muted">
            Accounts are not set up on this copy of the app. Your progress is kept in this browser — use{' '}
            <Link to="/settings" className="text-accent-fg underline">
              Settings → Export
            </Link>{' '}
            to move it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 py-8">
      <div className="page p-6">
        {user ? (
          <SignedIn user={user} />
        ) : (
          <>
            <h1 className="font-display text-[1.9rem] font-bold">{signingUp ? 'Create an account' : 'Sign in'}</h1>
            <p className="hand mt-1">your progress follows you to every device</p>
            <div className="mt-5">{signingUp ? <SignUpFormView /> : <SignInForm />}</div>
            <p className="mt-5 text-sm text-muted">
              {signingUp ? 'Already have an account? ' : 'New here? '}
              <button type="button" className="font-bold text-accent-fg underline" onClick={() => setParams(signingUp ? {} : { mode: 'signup' })}>
                {signingUp ? 'Sign in' : 'Create an account'}
              </button>
            </p>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-faint">
              <Icon name="user" size={14} /> You can also keep learning without an account: progress then stays in this browser.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
