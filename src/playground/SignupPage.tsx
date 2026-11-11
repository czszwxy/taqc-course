import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { withLabMode } from './PlaygroundShell';

/**
 * Bug Playground: sign-up form with 7 INTENTIONAL bugs (catalogued in
 * content/modules/06-qa-practice-lab/lessons/04-registration-form/tasks/04-bug-hunt/task.json).
 * Open with `?fixed` to get the correct implementation (used later as the "good" version in automation labs).
 * Keep this file and the bug catalog in sync.
 */

interface Values {
  fullName: string;
  email: string;
  age: string;
  password: string;
  confirm: string;
  country: string;
  terms: boolean;
}

type Errors = Partial<Record<keyof Values, string>>;

const EMPTY: Values = { fullName: '', email: '', age: '', password: '', confirm: '', country: '', terms: false };
const COUNTRIES = ['Ukraine', 'Poland', 'Germany', 'United Kingdom', 'United States', 'Other'];

function getBugs(fixed: boolean) {
  const on = !fixed;
  return {
    nameSpaces: on, // full name made only of spaces is accepted (no trim)
    emailDot: on, // email without a dot in the domain is accepted
    age18: on, // age 18 rejected (uses > instead of >=)
    pwdMax: on, // password of exactly 20 chars rejected (max off by one)
    confirm: on, // confirm password is never compared
    terms: on, // terms checkbox is not required
    greeting: on, // welcome message shows only the first name
  };
}

function validate(v: Values, bug: ReturnType<typeof getBugs>): Errors {
  const e: Errors = {};

  const name = bug.nameSpaces ? v.fullName : v.fullName.trim();
  if (name.length === 0) e.fullName = 'Full name is required';
  else if (name.length < 2 || name.length > 50) e.fullName = 'Full name must be 2–50 characters';

  const email = v.email.trim();
  const emailRe = bug.emailDot ? /^[^\s@]+@[^\s@]+$/ : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!email) e.email = 'Email is required';
  else if (!emailRe.test(email)) e.email = 'Enter a valid email address';

  const age = Number(v.age.trim());
  if (v.age.trim() === '') e.age = 'Age is required';
  else if (!Number.isInteger(age)) e.age = 'Age must be a whole number';
  else if ((bug.age18 ? age <= 18 : age < 18) || age > 65) e.age = 'Age must be between 18 and 65';

  const maxLen = bug.pwdMax ? 19 : 20;
  if (!v.password) e.password = 'Password is required';
  else if (v.password.length < 8 || v.password.length > maxLen) e.password = 'Password must be 8–20 characters';
  else if (!/\d/.test(v.password)) e.password = 'Password must contain at least one digit';

  if (!bug.confirm) {
    if (!v.confirm) e.confirm = 'Please confirm your password';
    else if (v.confirm !== v.password) e.confirm = 'Passwords do not match';
  }

  if (!v.country) e.country = 'Select your country';
  if (!bug.terms && !v.terms) e.terms = 'You must accept the Terms of Service';

  return e;
}

export function SignupPage() {
  const fixed = new URLSearchParams(window.location.search).has('fixed');
  const bug = withLabMode(getBugs(fixed));
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [welcome, setWelcome] = useState<string | null>(null);

  const set = <K extends keyof Values>(k: K, v: Values[K]) => setValues((prev) => ({ ...prev, [k]: v }));

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate(values, bug);
    setErrors(e);
    if (Object.keys(e).length === 0) {
      const name = bug.nameSpaces ? values.fullName : values.fullName.trim();
      setWelcome(bug.greeting ? name.trim().split(/\s+/)[0] ?? name : name);
    }
  };

  const inputCls = (k: keyof Values) =>
    `w-full rounded-md border px-3 py-2 text-[15px] outline-none focus:ring-2 focus:ring-teal-500/40 ${
      errors[k] ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white focus:border-teal-500'
    }`;

  return (
    <div className="min-h-full bg-slate-100 text-slate-900" style={{ colorScheme: 'light' }}>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2 text-lg font-bold text-teal-700">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-600 text-white">T</span> Taskly
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">demo app</span>
          </div>
          <Link to="/playground" className="text-sm text-slate-500 hover:text-slate-800">
            ← Back to QA Academy
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-5 py-8 lg:grid-cols-[1fr_340px]">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {welcome !== null ? (
            <div role="status" data-testid="signup-success" className="py-10 text-center">
              <div className="text-4xl">🎉</div>
              <h1 className="mt-3 text-2xl font-bold">Welcome, {welcome}!</h1>
              <p className="mt-2 text-slate-600">Your Taskly account has been created.</p>
              <button
                className="mt-6 rounded-md bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700"
                onClick={() => {
                  setValues(EMPTY);
                  setErrors({});
                  setWelcome(null);
                }}
              >
                Register another account
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate data-testid="signup-form">
              <h1 className="text-2xl font-bold">Create your account</h1>
              <p className="mt-1 text-sm text-slate-500">Plan your tasks in minutes. All fields are required.</p>

              <div className="mt-6 space-y-4">
                <FormRow id="fullName" label="Full name" error={errors.fullName}>
                  <input id="fullName" data-testid="signup-fullname" className={inputCls('fullName')} value={values.fullName} onChange={(e) => set('fullName', e.target.value)} autoComplete="name" />
                </FormRow>
                <FormRow id="email" label="Email" error={errors.email}>
                  <input id="email" type="email" data-testid="signup-email" className={inputCls('email')} value={values.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
                </FormRow>
                <FormRow id="age" label="Age" error={errors.age}>
                  <input id="age" inputMode="numeric" data-testid="signup-age" className={inputCls('age')} value={values.age} onChange={(e) => set('age', e.target.value)} />
                </FormRow>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormRow id="password" label="Password" error={errors.password}>
                    <input id="password" type="password" data-testid="signup-password" className={inputCls('password')} value={values.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" />
                  </FormRow>
                  <FormRow id="confirm" label="Confirm password" error={errors.confirm}>
                    <input id="confirm" type="password" data-testid="signup-confirm" className={inputCls('confirm')} value={values.confirm} onChange={(e) => set('confirm', e.target.value)} autoComplete="new-password" />
                  </FormRow>
                </div>
                <FormRow id="country" label="Country" error={errors.country}>
                  <select id="country" data-testid="signup-country" className={inputCls('country')} value={values.country} onChange={(e) => set('country', e.target.value)}>
                    <option value="">Select a country…</option>
                    {COUNTRIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </FormRow>
                <div>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" id="terms" data-testid="signup-terms" className="mt-0.5 h-4 w-4 accent-teal-600" checked={values.terms} onChange={(e) => set('terms', e.target.checked)} />
                    <span>
                      I agree to the <span className="text-teal-700 underline">Terms of Service</span>
                    </span>
                  </label>
                  {errors.terms && (
                    <p role="alert" className="mt-1 text-sm text-red-600" data-testid="error-terms">
                      {errors.terms}
                    </p>
                  )}
                </div>
              </div>

              <button type="submit" data-testid="signup-submit" className="mt-6 w-full rounded-md bg-teal-600 py-2.5 font-semibold text-white hover:bg-teal-700">
                Create account
              </button>
            </form>
          )}
        </div>

        <aside className="h-fit rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm">
          <div className="font-semibold text-amber-900">📋 Requirements (for testers)</div>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-amber-950/80">
            <li>
              <b>Full name</b>: required, 2–50 characters, cannot consist of spaces only.
            </li>
            <li>
              <b>Email</b>: required, valid format <code>name@domain.tld</code>.
            </li>
            <li>
              <b>Age</b>: required, whole number from <b>18 to 65</b> inclusive.
            </li>
            <li>
              <b>Password</b>: <b>8–20</b> characters, at least one digit.
            </li>
            <li>
              <b>Confirm password</b>: must match the password.
            </li>
            <li>
              <b>Country</b>: required.
            </li>
            <li>
              <b>Terms of Service</b>: must be accepted.
            </li>
            <li>Invalid fields show an error under the field; the account is not created.</li>
            <li>
              On success the form disappears and <b>“Welcome, &lt;Full name&gt;!”</b> is shown.
            </li>
          </ul>
          {fixed && <div className="mt-3 rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-800">Fixed version (no intentional bugs)</div>}
        </aside>
      </main>
    </div>
  );
}

function FormRow({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-600" data-testid={`error-${id}`}>
          {error}
        </p>
      )}
    </div>
  );
}
