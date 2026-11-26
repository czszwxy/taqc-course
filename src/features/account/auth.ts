import { emptyProgress } from '../progress/store';
import { AUTH_STORAGE_KEY, getSupabase } from './client';
import {
  accountError,
  AccountError,
  accountSyncNow,
  applyProgress,
  forgetAccount,
  hasUnsyncedChanges,
  restoreGuest,
  stashGuest,
  useAccount,
  type AccountUser,
} from './accountSync';
import { authEmailFor, isEmail, MIN_PASSWORD_LENGTH, normalizeEmail, normalizeLogin, type SignUpForm } from './rules';

/**
 * Sign up, sign in and sign out. Every account signs in to Supabase with the stand-in address of its login
 * (rules.ts); signing in with an email first asks the database which login it belongs to.
 */

const LOGIN_TAKEN = 'This login is taken. Try another one.';
const EMAIL_TAKEN = 'An account with this email already exists. Sign in instead.';
const WRONG_CREDENTIALS = 'Wrong login/email or password.';
const TOO_MANY = 'Too many attempts. Wait a minute and try again.';
const HTTP_TOO_MANY_REQUESTS = 429;

interface AuthErrorLike {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
}

const CODE_MESSAGES: Record<string, [string, string?]> = {
  invalid_credentials: [WRONG_CREDENTIALS, 'password'],
  validation_failed: [WRONG_CREDENTIALS, 'password'],
  email_address_invalid: [WRONG_CREDENTIALS, 'password'],
  user_already_exists: [LOGIN_TAKEN, 'login'],
  email_exists: [LOGIN_TAKEN, 'login'],
  weak_password: [`Use at least ${MIN_PASSWORD_LENGTH} characters.`, 'password'],
};

function authError(error: AuthErrorLike): AccountError {
  if (error.status === HTTP_TOO_MANY_REQUESTS || error.code?.startsWith('over_')) return new AccountError(TOO_MANY);
  const known = error.code ? CODE_MESSAGES[error.code] : undefined;
  return known ? new AccountError(known[0], 'other', known[1]) : accountError(error);
}

/** Puts this browser's signed-out progress aside and makes the account the working copy, then syncs. */
async function begin(user: AccountUser, addDeviceProgress: boolean, settingsWin: boolean): Promise<void> {
  const current = useAccount.getState().user;
  // Signing in again to the same account (its session ended): keep everything and just sync.
  if (current?.id === user.id) {
    useAccount.setState({ user });
    await accountSyncNow();
    return;
  }
  if (current) await signOut(true);
  stashGuest();
  if (!addDeviceProgress) applyProgress(emptyProgress());
  useAccount.setState({ user, rev: undefined, epoch: undefined, changes: 1, syncedChanges: 0, settingsAt: settingsWin ? new Date().toISOString() : '', status: 'idle' }, true);
  await accountSyncNow();
}

export async function signUp(form: SignUpForm, addDeviceProgress: boolean): Promise<void> {
  const login = normalizeLogin(form.login);
  const email = form.withEmail ? normalizeEmail(form.email) : '';
  const firstName = form.firstName.trim();
  const lastName = form.lastName.trim();
  const supabase = await getSupabase();
  const taken = await supabase.rpc('account_taken', { p_login: login, p_email: email }).single<{ login_taken: boolean; email_taken: boolean }>();
  if (taken.error) throw authError(taken.error);
  if (taken.data.login_taken) throw new AccountError(LOGIN_TAKEN, 'other', 'login');
  if (taken.data.email_taken) throw new AccountError(EMAIL_TAKEN, 'other', 'email');
  const { data, error } = await supabase.auth.signUp({
    email: authEmailFor(login),
    password: form.password,
    options: { data: { login, first_name: firstName, last_name: lastName, email } },
  });
  if (error) throw authError(error);
  // No session means the project asks for email confirmation, which stand-in addresses can never pass.
  if (!data.user || !data.session) throw new AccountError('Accounts are not set up correctly ("Confirm email" is on in Supabase). Tell the site owner.');
  await begin({ id: data.user.id, login, firstName, lastName, ...(email ? { email } : {}) }, addDeviceProgress, true);
}

export async function signIn(identifier: string, password: string, addDeviceProgress: boolean): Promise<void> {
  const typed = identifier.trim();
  const supabase = await getSupabase();
  const lookup = isEmail(typed) ? await supabase.rpc('login_for_email', { p_email: normalizeEmail(typed) }) : { data: normalizeLogin(typed), error: null };
  if (lookup.error) throw authError(lookup.error);
  // An unknown email gets the same answer as a wrong password (no hint which part was wrong).
  if (typeof lookup.data !== 'string' || !lookup.data) throw new AccountError(WRONG_CREDENTIALS, 'other', 'password');
  const login = lookup.data;
  const { data, error } = await supabase.auth.signInWithPassword({ email: authEmailFor(login), password });
  if (error) throw authError(error);
  const profile = await supabase.from('profiles').select('login, email, first_name, last_name').eq('id', data.user.id).single<{ login: string; email: string | null; first_name: string; last_name: string }>();
  if (profile.error) throw accountError(profile.error);
  const { first_name: firstName, last_name: lastName, email } = profile.data;
  await begin({ id: data.user.id, login: profile.data.login, firstName, lastName, ...(email ? { email } : {}) }, addDeviceProgress, false);
}

/**
 * Saves once more, then removes the account's progress from this browser and brings back what the browser had before
 * signing in. Returns 'unsynced' (and changes nothing) when the last changes could not be saved, unless `force`.
 */
export async function signOut(force = false): Promise<'done' | 'unsynced'> {
  await accountSyncNow();
  const { status } = useAccount.getState();
  if (!force && (status === 'error' || hasUnsyncedChanges())) return 'unsynced';
  const supabase = await getSupabase();
  await supabase.auth.signOut({ scope: 'local' });
  // Offline, supabase-js keeps the session it could not revoke: never leave it behind in a shared browser.
  Object.keys(localStorage)
    .filter((key) => key.startsWith(AUTH_STORAGE_KEY))
    .forEach((key) => localStorage.removeItem(key));
  restoreGuest();
  forgetAccount();
  return 'done';
}
