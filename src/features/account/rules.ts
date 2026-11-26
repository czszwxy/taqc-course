import type { EditorMode, Theme } from '../progress/store';
import type { DailyGoal } from '../workdesk/goal';

/**
 * Pure rules of user accounts. Supabase Auth knows users only by email, so every account signs in with a stand-in
 * address made from its login (`.invalid` can never receive mail); the real email, if any, lives in the profile.
 */
export const AUTH_EMAIL_DOMAIN = 'users.my-university.invalid';
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_NAME_LENGTH = 50;
/**
 * A lowercased login: 3–30 of a–z 0-9 . _ - starting with a letter or digit. Matches "anna_k", "qa.2026"; rejects "ab", "-anna", "anna k".
 * https://regex101.com/?regex=%5E%5Ba-z0-9%5D%5Ba-z0-9._-%5D%7B2%2C29%7D%24&testString=anna_k
 */
const LOGIN_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;
/**
 * A plausible email: something @ something . something, no spaces. Matches "anna@example.com"; rejects "anna@", "anna @x.io".
 * https://regex101.com/?regex=%5E%5B%5E%5Cs%40%5D%2B%40%5B%5E%5Cs%40%5D%2B%5C.%5B%5E%5Cs%40%5D%2B%24&testString=anna%40example.com
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const LOGIN_RULE = '3–30 characters: letters a–z, digits, dots, hyphens or underscores, starting with a letter or digit.';

export interface SignUpForm {
  firstName: string;
  lastName: string;
  login: string;
  email: string;
  password: string;
  repeat: string;
  /** "With email" (true) or "Login only" (false). */
  withEmail: boolean;
}

type Field = Exclude<keyof SignUpForm, 'withEmail'> | 'identifier';
export type FieldErrors = Partial<Record<Field, string>>;

/** The settings an account keeps: newer copy wins (see newerSettings). */
export interface SyncedSettings {
  theme: Theme;
  editorMode: EditorMode;
  currentCourseId?: string;
  goal: DailyGoal;
  updatedAt: string;
}

export const normalizeLogin = (raw: string): string => raw.trim().toLowerCase();
export const normalizeEmail = (raw: string): string => raw.trim().toLowerCase();
export const authEmailFor = (login: string): string => `${login}@${AUTH_EMAIL_DOMAIN}`;
export const isEmail = (identifier: string): boolean => identifier.includes('@');

const errorsOf = (pairs: [Field, string | false][]): FieldErrors =>
  Object.fromEntries(pairs.filter((pair): pair is [Field, string] => pair[1] !== false));

function nameError(raw: string, label: string): string | false {
  const name = raw.trim();
  if (!name) return `Enter your ${label}.`;
  return name.length > MAX_NAME_LENGTH && `Use up to ${MAX_NAME_LENGTH} characters.`;
}

function emailError(raw: string): string | false {
  const email = normalizeEmail(raw);
  if (!email) return 'Enter your email.';
  return !EMAIL_PATTERN.test(email) && 'Enter an email like name@example.com.';
}

export function validateSignUp(form: SignUpForm): FieldErrors {
  return errorsOf([
    ['firstName', nameError(form.firstName, 'first name')],
    ['lastName', nameError(form.lastName, 'last name')],
    ['login', !LOGIN_PATTERN.test(normalizeLogin(form.login)) && `Use ${LOGIN_RULE}`],
    ['email', form.withEmail && emailError(form.email)],
    ['password', form.password.length < MIN_PASSWORD_LENGTH && `Use at least ${MIN_PASSWORD_LENGTH} characters.`],
    ['repeat', form.repeat !== form.password && "The passwords don't match."],
  ]);
}

export function validateSignIn(identifier: string, password: string): FieldErrors {
  return errorsOf([
    ['identifier', !identifier.trim() && 'Enter your login or email.'],
    ['password', !password && 'Enter your password.'],
  ]);
}

/** The more recently changed copy of the settings (a missing copy always loses). */
export function newerSettings(a: SyncedSettings | undefined, b: SyncedSettings | undefined): SyncedSettings | undefined {
  if (!a) return b;
  if (!b) return a;
  return b.updatedAt > a.updatedAt ? b : a;
}
