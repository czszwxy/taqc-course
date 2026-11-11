import { useState, type FormEvent } from 'react';
import { PlaygroundShell, PgField, inputClass, isFixedMode } from './PlaygroundShell';

/**
 * Bug Playground: Taskly login with 6 INTENTIONAL bugs (catalogued in
 * content/modules/06-qa-practice-lab/lessons/03-login-page/tasks/04-bug-hunt/task.json and used by the
 * regression run in lessons/08-regression-run). Open with `?fixed` for the correct implementation.
 * Keep this file and the bug catalog in sync.
 */

interface Account {
  email: string;
  password: string;
  locked: boolean;
}

const ACCOUNTS: Account[] = [
  { email: 'demo@taskly.test', password: 'Demo1234', locked: false },
  { email: 'locked@taskly.test', password: 'Locked123', locked: true },
];

/** Failed attempts in a row after which the account is temporarily locked. */
const LOCK_AFTER_FAILURES = 3;
const BUGGY_LOCK_AFTER_FAILURES = 5;

const MSG = {
  emailRequired: 'Email is required',
  passwordRequired: 'Password is required',
  invalid: 'Invalid email or password',
  tooMany: 'Too many failed attempts. Try again in 15 minutes.',
  locked: 'Your account is locked. Contact support.',
  resetSent: 'If an account exists for this email, we have sent a password reset link.',
  resetNeedsEmail: 'Enter your email first',
};

function getBugs(fixed: boolean) {
  const on = !fixed;
  return {
    emailCase: on, // email is compared case-sensitively
    emailSpaces: on, // spaces around the email are not trimmed
    lockout: on, // lock happens after 5 failures instead of 3
    lockedLogin: on, // a locked account can still sign in
    rememberMe: on, // email is remembered even when "Remember me" is unchecked
    forgotEmpty: on, // "Forgot password?" with an empty email shows the success message
  };
}
type Bugs = ReturnType<typeof getBugs>;

type Outcome = { ok: true; email: string } | { ok: false; message: string };

function normalizeEmail(raw: string, bug: Bugs): string {
  const trimmed = bug.emailSpaces ? raw : raw.trim();
  return bug.emailCase ? trimmed : trimmed.toLowerCase();
}

function attemptLogin(email: string, password: string, failures: Record<string, number>, bug: Bugs): { outcome: Outcome; failures: Record<string, number> } {
  const limit = bug.lockout ? BUGGY_LOCK_AFTER_FAILURES : LOCK_AFTER_FAILURES;
  const count = failures[email] ?? 0;
  if (count >= limit) return { outcome: { ok: false, message: MSG.tooMany }, failures };

  const account = ACCOUNTS.find((a) => a.email === email);
  if (!account || account.password !== password) {
    const next = count + 1;
    const message = next >= limit ? MSG.tooMany : MSG.invalid;
    return { outcome: { ok: false, message }, failures: { ...failures, [email]: next } };
  }
  if (account.locked && !bug.lockedLogin) return { outcome: { ok: false, message: MSG.locked }, failures };
  return { outcome: { ok: true, email: account.email }, failures: { ...failures, [email]: 0 } };
}

interface FieldErrors {
  email?: string;
  password?: string;
}

export function LoginPage() {
  const fixed = isFixedMode();
  const bug = getBugs(fixed);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [failures, setFailures] = useState<Record<string, number>>({});
  const [signedIn, setSignedIn] = useState<string | null>(null);
  const [remembered, setRemembered] = useState('');

  const clearMessages = () => {
    setMessage(null);
    setInfo(null);
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    clearMessages();
    const fieldErrors: FieldErrors = {
      email: email.trim() ? undefined : MSG.emailRequired,
      password: password ? undefined : MSG.passwordRequired,
    };
    setErrors(fieldErrors);
    if (fieldErrors.email || fieldErrors.password) return;

    const result = attemptLogin(normalizeEmail(email, bug), password, failures, bug);
    setFailures(result.failures);
    if (!result.outcome.ok) {
      setMessage(result.outcome.message);
      return;
    }
    const keepEmail = remember || bug.rememberMe;
    setRemembered(keepEmail ? email.trim() : '');
    setSignedIn(result.outcome.email);
  };

  const forgot = () => {
    clearMessages();
    if (!email.trim() && !bug.forgotEmpty) {
      setErrors({ email: MSG.resetNeedsEmail });
      return;
    }
    setErrors({});
    setInfo(MSG.resetSent);
  };

  const logOut = () => {
    setSignedIn(null);
    setEmail(remembered);
    setPassword('');
    setShowPassword(false);
    setRemember(false);
    setErrors({});
    clearMessages();
  };

  const reset = () => {
    logOut();
    setEmail('');
    setRemembered('');
    setFailures({});
  };

  const requirements = (
    <>
      <li>
        Test accounts: <code>demo@taskly.test</code> / <code>Demo1234</code> (active) and <code>locked@taskly.test</code> / <code>Locked123</code>{' '}
        (blocked by an admin).
      </li>
      <li>
        <b>Email</b> and <b>Password</b> are required: an empty field shows “Email is required” / “Password is required”.
      </li>
      <li>
        Email is <b>case-insensitive</b> and spaces before/after it are ignored. The password is case-sensitive.
      </li>
      <li>
        Wrong email or password → the same message <b>“Invalid email or password”</b> (never reveal which one is wrong).
      </li>
      <li>
        After <b>3 failed attempts in a row</b> the account is temporarily locked: “Too many failed attempts…” is shown, and even the correct
        password is rejected.
      </li>
      <li>
        A blocked account with correct credentials → <b>“Your account is locked. Contact support.”</b>, no sign-in.
      </li>
      <li>
        <b>Show password</b> shows the password as text; unchecking hides it again.
      </li>
      <li>
        <b>Remember me</b> checked → after Log out the email is prefilled. Not checked → the form is empty after Log out.
      </li>
      <li>
        <b>Forgot password?</b> needs an email in the field; if it is empty → “Enter your email first” under Email.
      </li>
      <li>On success: “Welcome back!” and “Signed in as &lt;email&gt;”.</li>
    </>
  );

  return (
    <PlaygroundShell brand="taskly" fixed={fixed} requirements={requirements} onReset={reset}>
      {signedIn !== null ? (
        <div role="status" data-testid="login-success" className="py-10 text-center">
          <div className="text-4xl">👋</div>
          <h1 className="mt-3 text-2xl font-bold">Welcome back!</h1>
          <p className="mt-2 text-slate-600" data-testid="signed-in-as">
            Signed in as {signedIn}
          </p>
          <button type="button" data-testid="logout" onClick={logOut} className="mt-6 rounded-md bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700">
            Log out
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate data-testid="login-form" className="mx-auto max-w-sm py-4">
          <h1 className="text-2xl font-bold">Sign in to Taskly</h1>
          <p className="mt-1 text-sm text-slate-500">Welcome back! Use one of the test accounts from the requirements.</p>

          <div className="mt-6 space-y-4">
            <PgField id="email" label="Email" error={errors.email}>
              <input id="email" type="text" inputMode="email" data-testid="login-email" className={inputCls(errors.email)} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </PgField>
            <PgField id="password" label="Password" error={errors.password}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                data-testid="login-password"
                className={inputCls(errors.password)}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </PgField>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" data-testid="login-show-password" className="h-4 w-4 accent-teal-600" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
                Show password
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" data-testid="login-remember" className="h-4 w-4 accent-teal-600" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Remember me
              </label>
            </div>
          </div>

          {message && (
            <p role="alert" data-testid="login-error" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {message}
            </p>
          )}
          {info && (
            <p role="status" data-testid="login-info" className="mt-4 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
              {info}
            </p>
          )}

          <button type="submit" data-testid="login-submit" className="mt-6 w-full rounded-md bg-teal-600 py-2.5 font-semibold text-white hover:bg-teal-700">
            Log in
          </button>
          <button type="button" data-testid="login-forgot" onClick={forgot} className="mt-3 w-full text-center text-sm text-teal-700 underline hover:text-teal-900">
            Forgot password?
          </button>
        </form>
      )}
    </PlaygroundShell>
  );
}

function inputCls(error: string | undefined): string {
  return inputClass(Boolean(error));
}
