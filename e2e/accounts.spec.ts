import { expect, test, type Browser, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * User accounts end to end, against the LOCAL Supabase (see playwright.config.ts). Every test makes its own accounts
 * with unique logins, so tests never depend on each other or on what an earlier run left behind.
 */

const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? '';
const PUBLISHABLE_KEY = process.env.E2E_PUBLISHABLE_KEY ?? '';
const SECRET_KEY = process.env.E2E_SECRET_KEY ?? '';
const PASSWORD = 'secret-pass-123';
const LESSON_A = { path: '/learn/01-intro-to-testing/01-what-is-testing', id: '01-intro-to-testing/01-what-is-testing' };
const LESSON_B = { path: '/learn/01-intro-to-testing/02-qa-qc-testing', id: '01-intro-to-testing/02-qa-qc-testing' };
const SYNC_TIMEOUT_MS = 20_000;
const PHONE_WIDTH = 375;
const PHONE_HEIGHT = 812;
const PHONE = { width: PHONE_WIDTH, height: PHONE_HEIGHT };
/**
 * The message after the account vanished: "This account no longer exists…" or "Your session has ended…";
 * rejects "No connection…". https://regex101.com/?regex=no+longer+exists%7Csession+has+ended&testString=This+account+no+longer+exists
 */
const ACCOUNT_GONE = /no longer exists|session has ended/;
const BIG_DRAFT_CHARS = 2_000_000;
const RADIX = 36;
const runId = Date.now().toString(RADIX);
const counter = { next: 0 };
const uniqueLogin = (): string => `e2e${runId}${(counter.next += 1)}`;
const standIn = (login: string): string => `${login}@users.my-university.invalid`;

interface SignUpOptions {
  login: string;
  email?: string;
  addDevice?: boolean;
}

async function signUp(page: Page, { login, email, addDevice }: SignUpOptions): Promise<void> {
  await page.goto('/account?mode=signup');
  if (!email) await page.getByText('Login only', { exact: true }).click();
  await page.getByLabel('First name').fill('Test');
  await page.getByLabel('Last name').fill('Learner');
  await page.getByLabel('Login', { exact: true }).fill(login);
  if (email) await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Repeat password').fill(PASSWORD);
  const box = page.getByLabel("Add this browser's progress to my account");
  if (addDevice !== undefined && (await box.count()) > 0) await box.setChecked(addDevice);
  await page.getByRole('button', { name: 'Create account' }).click();
}

async function signIn(page: Page, identifier: string, password = PASSWORD, addDevice = false): Promise<void> {
  await page.goto('/account');
  await page.getByLabel('Login or email').fill(identifier);
  await page.getByLabel('Password', { exact: true }).fill(password);
  const box = page.getByLabel("Add this browser's progress to my account");
  if ((await box.count()) > 0) await box.setChecked(addDevice);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

const signedIn = (page: Page): Promise<void> => expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();

/** Waits until this browser has no unsaved changes (the account store's counters match). */
async function synced(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const saved = JSON.parse(localStorage.getItem('my-university:account') ?? '{}') as { state?: { user?: unknown; changes?: number; syncedChanges?: number } };
          return saved.state?.user ? saved.state.changes === saved.state.syncedChanges : null;
        }),
      { timeout: SYNC_TIMEOUT_MS },
    )
    .toBe(true);
}

async function markRead(page: Page, lesson: { path: string }): Promise<void> {
  await page.goto(lesson.path);
  await page.getByRole('button', { name: 'Mark as read & go to practice' }).click();
}

function theoryRead(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('my-university:progress') ?? '{}') as { state?: { theoryRead?: Record<string, string> } };
    return Object.keys(saved.state?.theoryRead ?? {}).sort();
  });
}

async function newPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  return context.newPage();
}

const syncNow = (page: Page): Promise<void> => page.getByRole('button', { name: 'Sync now' }).click();

test('sign up with email, then sign in with the email in a new browser sees the same progress', async ({ page, browser }) => {
  const login = uniqueLogin();
  const email = `${login}@example.com`;
  await signUp(page, { login, email });
  await signedIn(page);
  await markRead(page, LESSON_A);
  await page.goto('/account');
  await synced(page);

  const phone = await newPage(browser);
  await signIn(phone, email.toUpperCase());
  await signedIn(phone);
  await synced(phone);
  expect(await theoryRead(phone)).toContain(LESSON_A.id);
  await expect(phone.getByText(login, { exact: true })).toBeVisible();
});

test('sign up with a login only, then sign in with the login typed in capitals and spaces', async ({ page, browser }) => {
  const login = uniqueLogin();
  await signUp(page, { login });
  await signedIn(page);
  await expect(page.getByText('none (signed up with a login only)')).toBeVisible();

  const other = await newPage(browser);
  await signIn(other, `  ${login.toUpperCase()} `);
  await signedIn(other);
});

test('duplicate login, duplicate email and wrong credentials show their messages', async ({ page, browser }) => {
  const login = uniqueLogin();
  const email = `${login}@example.com`;
  await signUp(page, { login, email });
  await signedIn(page);

  const other = await newPage(browser);
  await signUp(other, { login, email: `other.${email}` });
  await expect(other.getByText('This login is taken. Try another one.')).toBeVisible();
  await signUp(other, { login: uniqueLogin(), email: email.toUpperCase() });
  await expect(other.getByText('An account with this email already exists. Sign in instead.')).toBeVisible();
  await signIn(other, login, 'wrong-password-1');
  await expect(other.getByText('Wrong login/email or password.')).toBeVisible();
  await signIn(other, `nobody.${email}`);
  await expect(other.getByText('Wrong login/email or password.')).toBeVisible();
});

test("the browser's progress moves into a new account, and signing out brings the browser's own progress back", async ({ page, browser }) => {
  await markRead(page, LESSON_A);
  const login = uniqueLogin();
  await signUp(page, { login, addDevice: true });
  await signedIn(page);
  await synced(page);
  await markRead(page, LESSON_B);
  await page.goto('/account');
  await synced(page);
  expect(await theoryRead(page)).toEqual([LESSON_A.id, LESSON_B.id].sort());

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  expect(await theoryRead(page)).toEqual([LESSON_A.id]);

  const other = await newPage(browser);
  await signIn(other, login);
  await synced(other);
  expect(await theoryRead(other)).toEqual([LESSON_A.id, LESSON_B.id].sort());
});

test('signing in on a friend’s browser does not take their progress', async ({ page, browser }) => {
  const login = uniqueLogin();
  await signUp(page, { login });
  await signedIn(page);
  const friend = await newPage(browser);
  await markRead(friend, LESSON_B);
  await signIn(friend, login);
  await synced(friend);
  expect(await theoryRead(friend)).toEqual([]);
});

test('two browsers saving different lessons at the same moment keep both', async ({ page, browser }) => {
  const login = uniqueLogin();
  await signUp(page, { login });
  await signedIn(page);
  const other = await newPage(browser);
  await signIn(other, login);
  await synced(other);

  await markRead(page, LESSON_A);
  await markRead(other, LESSON_B);
  await Promise.all([page.goto('/account'), other.goto('/account')]);
  await synced(page);
  await synced(other);
  await syncNow(page);
  await synced(page);
  await syncNow(other);
  await synced(other);
  const both = [LESSON_A.id, LESSON_B.id].sort();
  expect(await theoryRead(page)).toEqual(both);
  expect(await theoryRead(other)).toEqual(both);
});

test('a deleted account keeps the progress in the browser and asks to sign in again', async ({ page }) => {
  const login = uniqueLogin();
  await signUp(page, { login });
  await signedIn(page);
  await markRead(page, LESSON_A);
  await page.goto('/account');
  await synced(page);

  const admin = createClient(SUPABASE_URL, SECRET_KEY, { auth: { persistSession: false } });
  const { data } = await admin.auth.admin.listUsers();
  const user = data.users.find((u) => u.email === standIn(login));
  expect(user, 'the test account exists').toBeTruthy();
  await admin.auth.admin.deleteUser(user?.id ?? '');

  await syncNow(page);
  await expect(page.getByRole('alert')).toContainText(ACCOUNT_GONE);
  expect(await theoryRead(page)).toContain(LESSON_A.id);
});

test('signing out while offline warns before unsaved work leaves the browser', async ({ page }) => {
  const login = uniqueLogin();
  await signUp(page, { login });
  await signedIn(page);
  await synced(page);
  await markRead(page, LESSON_A);
  await page.route(`${SUPABASE_URL}/**`, (route) => route.abort());
  await page.getByRole('link', { name: `Your account: ${login}` }).click();

  const dialog = page.waitForEvent('dialog');
  await page.getByRole('button', { name: 'Sign out' }).click();
  const warning = await dialog;
  expect(warning.message()).toContain('not saved to your account');
  await warning.dismiss();
  await signedIn(page);
  expect(await theoryRead(page)).toContain(LESSON_A.id);
});

test('with Supabase unreachable the app still opens and works, and says there is no connection', async ({ page }) => {
  await page.route(`${SUPABASE_URL}/**`, (route) => route.abort());
  await markRead(page, LESSON_A);
  expect(await theoryRead(page)).toEqual([LESSON_A.id]);
  await signIn(page, uniqueLogin());
  await expect(page.getByRole('alert')).toContainText('No connection. Check the internet and try again.');
});

test("one account cannot read or change another account's progress", async () => {
  const client = () => createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const [anna, taras] = [client(), client()];
  const [annaLogin, tarasLogin] = [uniqueLogin(), uniqueLogin()];
  const meta = (login: string) => ({ data: { login, first_name: 'T', last_name: 'L', email: '' } });
  const a = await anna.auth.signUp({ email: standIn(annaLogin), password: PASSWORD, options: meta(annaLogin) });
  const t = await taras.auth.signUp({ email: standIn(tarasLogin), password: PASSWORD, options: meta(tarasLogin) });
  const annaId = a.data.user?.id ?? '';
  expect(t.error).toBeNull();

  const rows = await taras.from('progress').select('user_id');
  expect(rows.data?.map((r) => r.user_id)).toEqual([t.data.user?.id]);
  const profiles = await taras.from('profiles').select('login');
  expect(profiles.data?.map((p) => p.login)).toEqual([tarasLogin]);
  const changed = await taras.from('progress').update({ data: {} }).eq('user_id', annaId).select('user_id');
  expect(changed.data).toEqual([]);
  const stranger = await client().from('progress').select('user_id');
  expect(stranger.data ?? []).toEqual([]);
});

test('a real address cannot be registered as a login', async () => {
  const client = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const login = uniqueLogin();
  const result = await client.auth.signUp({ email: `${login}@example.com`, password: PASSWORD, options: { data: { login, first_name: 'M', last_name: 'M' } } });
  expect(result.error).not.toBeNull();
});

test('2 MB of drafts saves to the account and loads in another browser', async ({ page, browser }) => {
  await page.goto('/');
  await page.evaluate((size) => {
    const now = new Date().toISOString();
    const state = { tasks: {}, drafts: { big: 'x'.repeat(size) }, draftTimes: { big: now }, theoryRead: {}, verifiedLinks: {}, undone: {} };
    localStorage.setItem('my-university:progress', JSON.stringify({ state, version: 1 }));
  }, BIG_DRAFT_CHARS);
  await markRead(page, LESSON_A);
  const login = uniqueLogin();
  await signUp(page, { login, addDevice: true });
  await signedIn(page);
  await synced(page);

  const other = await newPage(browser);
  await signIn(other, login);
  await synced(other);
  const length = await other.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('my-university:progress') ?? '{}') as { state?: { drafts?: { big?: string } } };
    return saved.state?.drafts?.big?.length ?? 0;
  });
  expect(length).toBe(BIG_DRAFT_CHARS);
});

test('the account pages fit a 375 px phone', async ({ page }) => {
  await page.setViewportSize(PHONE);
  const fits = (): Promise<boolean> => page.evaluate(() => {
    const main = document.getElementById('main');
    return Boolean(main) && (main?.scrollWidth ?? 0) <= (main?.clientWidth ?? 0);
  });
  await page.goto('/account?mode=signup');
  expect(await fits()).toBe(true);
  await signUp(page, { login: uniqueLogin() });
  await signedIn(page);
  expect(await fits()).toBe(true);
});
