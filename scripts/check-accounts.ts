/**
 * `npm test`: the pure rules of user accounts (src/features/account/rules.ts) and the shared progress combine.
 * A slip here lets a bad login through, blocks a good one, or picks the wrong copy of the settings.
 */
import assert from 'node:assert/strict';
import type { ProgressData, TaskProgress } from '../src/features/progress/store';
import { combineProgress } from '../src/features/sync/merge';
import { authEmailFor, newerSettings, normalizeEmail, normalizeLogin, validateSignIn, validateSignUp, type SignUpForm, type SyncedSettings } from '../src/features/account/rules';

const T1 = '2026-01-01T10:00:00.000Z';
const T2 = '2026-01-02T10:00:00.000Z';
const T3 = '2026-01-03T10:00:00.000Z';
const STEADY_GOAL = 3;
const TOO_LONG_LOGIN = 31;
const TOO_LONG_NAME = 51;

const form = (part: Partial<SignUpForm> = {}): SignUpForm => ({
  firstName: 'Anna',
  lastName: 'Koval',
  login: 'anna_k',
  email: '',
  password: 'secret-123',
  repeat: 'secret-123',
  withEmail: false,
  ...part,
});
const settings = (updatedAt: string, theme: SyncedSettings['theme'] = 'dark'): SyncedSettings => ({ theme, editorMode: 'auto', goal: STEADY_GOAL, updatedAt });
const progress = (part: Partial<ProgressData>): ProgressData => ({ tasks: {}, drafts: {}, draftTimes: {}, theoryRead: {}, verifiedLinks: {}, undone: {}, ...part });
const task = (updatedAt: string): TaskProgress => ({ status: 'solved', attempts: 1, failedAttempts: 0, hintsUsed: 0, solutionViewed: false, solvedAt: updatedAt, updatedAt });

const checks: [string, () => void][] = [
  ['a login typed with capitals and spaces becomes lowercase', () => assert.equal(normalizeLogin('  Anna_K '), 'anna_k')],
  ['an email is trimmed and lowercased', () => assert.equal(normalizeEmail(' Anna@Example.COM '), 'anna@example.com')],
  ['every account signs in to Supabase with the stand-in address of its login', () => assert.equal(authEmailFor('anna_k'), 'anna_k@users.my-university.invalid')],
  ['a complete login-only form has no errors', () => assert.deepEqual(validateSignUp(form()), {})],
  ['a complete form with email has no errors', () => assert.deepEqual(validateSignUp(form({ withEmail: true, email: 'anna@example.com' })), {})],
  ['the email way needs an email', () => assert.ok(validateSignUp(form({ withEmail: true })).email)],
  ['the email way rejects an address without a domain', () => assert.ok(validateSignUp(form({ withEmail: true, email: 'anna@' })).email)],
  ['the login-only way ignores the email field', () => assert.equal(validateSignUp(form({ email: 'not an email' })).email, undefined)],
  ['a login shorter than 3 characters is rejected', () => assert.ok(validateSignUp(form({ login: 'ab' })).login)],
  ['a login longer than 30 characters is rejected', () => assert.ok(validateSignUp(form({ login: 'a'.repeat(TOO_LONG_LOGIN) })).login)],
  ['a login must start with a letter or digit', () => assert.ok(validateSignUp(form({ login: '-anna' })).login)],
  ['a login with a space inside is rejected', () => assert.ok(validateSignUp(form({ login: 'anna k' })).login)],
  ['a login typed with capitals passes (it is lowercased)', () => assert.equal(validateSignUp(form({ login: ' Anna.K ' })).login, undefined)],
  ['a password under 8 characters is rejected', () => assert.ok(validateSignUp(form({ password: 'short', repeat: 'short' })).password)],
  ['the repeated password must match', () => assert.ok(validateSignUp(form({ repeat: 'secret-124' })).repeat)],
  ['first and last name are required (spaces do not count)', () => {
    const errors = validateSignUp(form({ firstName: '  ', lastName: '' }));
    assert.ok(errors.firstName && errors.lastName);
  }],
  ['a name over 50 characters is rejected', () => assert.ok(validateSignUp(form({ lastName: 'K'.repeat(TOO_LONG_NAME) })).lastName)],
  ['sign-in needs a login or email', () => assert.ok(validateSignIn('  ', 'x').identifier)],
  ['sign-in needs a password', () => assert.ok(validateSignIn('a@b.co', '').password)],
  ['sign-in with both filled has no errors', () => assert.deepEqual(validateSignIn('Anna_K', 'secret-123'), {})],
  ['of two settings copies the newer one wins, whichever side it is on', () => {
    const older = settings(T1, 'light');
    const newer = settings(T2, 'dark');
    assert.deepEqual([newerSettings(older, newer), newerSettings(newer, older)], [newer, newer]);
  }],
  ['a missing settings copy loses to the other one', () => {
    const only = settings(T1);
    assert.deepEqual([newerSettings(undefined, only), newerSettings(only, undefined)], [only, only]);
  }],
  ['with no server copy the local progress is kept as it is', () => {
    const local = progress({ tasks: { t: task(T1) } });
    assert.deepEqual(combineProgress(local, '', null), local);
  }],
  ['after a newer reset elsewhere only local work done later survives', () => {
    const local = progress({ tasks: { old: task(T1), fresh: task(T3) } });
    const merged = combineProgress(local, '', { data: progress({}), epoch: T2 });
    assert.deepEqual(Object.keys(merged.tasks), ['fresh']);
  }],
];

const failures = checks.flatMap(([name, check]) => {
  try {
    check();
    return [];
  } catch (e) {
    return [`✗ ${name}\n  ${e instanceof Error ? e.message : String(e)}`];
  }
});
console.log(failures.length === 0 ? `Accounts: ${checks.length} checks passed.` : failures.join('\n'));
process.exitCode = failures.length === 0 ? 0 : 1;
