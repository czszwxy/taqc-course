import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { emptyProgress, snapshotProgress, useProgress, useSettings, type ProgressData } from '../progress/store';
import { combineProgress, sameProgress, stableStringify } from '../sync/merge';
import { useDailyGoal } from '../workdesk/goal';
import { getSupabase } from './client';
import { newerSettings, type SyncedSettings } from './rules';

/**
 * Progress sync of a signed-in account: this browser keeps the working copy (localStorage), the account's row in
 * Supabase (`progress`) is the shared copy. Same moments and merge rules as the gist sync (merge.ts). The row has a
 * revision `rev`: a sync first reads only `rev`; when nobody else saved and nothing changed here, nothing is sent.
 * Otherwise it merges and writes `rev + 1` only if the row still has the revision it read (else it reads again).
 */

const ACCOUNT_KEY = 'my-university:account';
/** Signed-out progress and settings of this browser, put aside while an account is signed in. */
const GUEST_KEY = 'my-university:guest';
const SYNC_DELAY_MS = 8_000;
const MAX_SAVE_ATTEMPTS = 3;

export type AccountSyncMode = 'merge' | 'replace';
export type AccountErrorKind = 'session' | 'network' | 'other';

export class AccountError extends Error {
  constructor(
    message: string,
    readonly kind: AccountErrorKind = 'other',
    readonly field?: string,
  ) {
    super(message);
  }
}

export interface AccountUser {
  id: string;
  login: string;
  firstName: string;
  lastName: string;
  email?: string;
}

interface AccountState {
  user?: AccountUser;
  /** The row revision this browser last merged with (undefined = never synced). */
  rev?: number;
  /** Time of the last reset / import this browser's progress is based on (see the epoch note in sync.ts). */
  epoch?: string;
  /** Local changes counter; `syncedChanges` is its value at the last successful sync. */
  changes: number;
  syncedChanges: number;
  /** When the settings or the daily goal last changed in this browser ('' = take the account's). */
  settingsAt: string;
  lastSyncedAt?: string;
  status: 'idle' | 'syncing' | 'ok' | 'error';
  error?: string;
  errorKind?: AccountErrorKind;
}

const signedOut = (): AccountState => ({ changes: 0, syncedChanges: 0, settingsAt: '', status: 'idle' });

export const useAccount = create<AccountState>()(
  persist(signedOut, {
    name: ACCOUNT_KEY,
    version: 1,
    partialize: ({ user, rev, epoch, changes, syncedChanges, settingsAt, lastSyncedAt }) => ({ user, rev, epoch, changes, syncedChanges, settingsAt, lastSyncedAt }),
  }),
);

export const isSignedIn = (): boolean => Boolean(useAccount.getState().user);
export const hasUnsyncedChanges = (): boolean => {
  const { changes, syncedChanges } = useAccount.getState();
  return changes !== syncedChanges;
};

export const NO_CONNECTION = 'No connection. Check the internet and try again.';
const SESSION_ENDED = 'Your session has ended. Sign in again to keep syncing — your progress stays in this browser.';

/**
 * Browser wording of a request that never reached the server. Matches "TypeError: Failed to fetch",
 * "AuthRetryableFetchError", "NetworkError when attempting…", "Load failed" (Safari); rejects "Invalid login credentials".
 * https://regex101.com/?regex=fetch%7Cnetwork%7Cload+failed&flags=i&testString=TypeError%3A+Failed+to+fetch
 */
const NETWORK_FAILURE = /fetch|network|load failed/i;
/** An expired or invalid access token. Matches "JWT expired", "invalid JWT"; rejects "duplicate key value". https://regex101.com/?regex=jwt&flags=i&testString=JWT+expired */
const BAD_TOKEN = /jwt/i;

/** A Supabase / network error as a message for the learner. */
export function accountError(error: { message?: string; code?: string; status?: number; name?: string }): AccountError {
  const text = `${error.name ?? ''} ${error.message ?? ''}`;
  if (NETWORK_FAILURE.test(text)) return new AccountError(NO_CONNECTION, 'network');
  if (error.code === 'PGRST301' || BAD_TOKEN.test(text)) return new AccountError(SESSION_ENDED, 'session');
  return new AccountError(`Something went wrong (${error.message ?? 'unknown error'}). Try again.`);
}

/* ---------- local copies ---------- */

const sync = { running: null as Promise<void> | null, pending: false, applying: false };

/** Writes into the local stores without counting it as a local change. */
function applying(fn: () => void): void {
  sync.applying = true;
  try {
    fn();
  } finally {
    sync.applying = false;
  }
}

export function localSettings(updatedAt: string): SyncedSettings {
  const { theme, editorMode, currentCourseId } = useSettings.getState();
  return { theme, editorMode, ...(currentCourseId ? { currentCourseId } : {}), goal: useDailyGoal.getState().goal, updatedAt };
}

function applySettings(settings: SyncedSettings): void {
  applying(() => {
    useSettings.setState({ theme: settings.theme, editorMode: settings.editorMode, currentCourseId: settings.currentCourseId });
    useDailyGoal.setState({ goal: settings.goal });
  });
}

export function applyProgress(data: ProgressData): void {
  applying(() => useProgress.getState().importData(data));
}

interface GuestCopy {
  progress: ProgressData;
  settings: SyncedSettings;
}

export function stashGuest(): void {
  const copy: GuestCopy = { progress: snapshotProgress(), settings: localSettings('') };
  localStorage.setItem(GUEST_KEY, JSON.stringify(copy));
}

/** Brings back this browser's signed-out progress and settings (or empty progress when there were none). */
export function restoreGuest(): void {
  const saved = localStorage.getItem(GUEST_KEY);
  const copy = saved ? (JSON.parse(saved) as GuestCopy) : null;
  applyProgress(copy?.progress ?? emptyProgress());
  if (copy) applySettings(copy.settings);
  localStorage.removeItem(GUEST_KEY);
}

export function forgetAccount(): void {
  useAccount.setState(signedOut(), true);
}

/* ---------- the sync ---------- */

interface ProgressRow {
  data: Partial<ProgressData>;
  epoch: string;
  settings: SyncedSettings | null;
  rev: number;
}

const isProgress = (data: Partial<ProgressData> | null): data is ProgressData => Boolean(data && typeof data.tasks === 'object');

async function readRow<T>(columns: string, userId: string): Promise<T> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('progress').select(columns).eq('user_id', userId).maybeSingle();
  if (error) throw accountError(error);
  // No row while signed in: the account was deleted (or the session belongs to nobody any more).
  if (!data) throw new AccountError('This account no longer exists. Sign in again or create a new account — your progress stays in this browser.', 'session');
  return data as T;
}

/** Saves `next` as revision `rev + 1` if the row still has `rev`; false when another device saved first. */
async function writeRow(userId: string, rev: number, next: Omit<ProgressRow, 'rev'>): Promise<boolean> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('progress')
    .update({ ...next, rev: rev + 1, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('rev', rev)
    .select('rev');
  if (error) throw accountError(error);
  return data.length === 1;
}

interface Outcome {
  rev: number;
  epoch: string;
}

/** One read–merge–write round; null when another device saved in between (try again). */
async function syncOnce(userId: string, changesAtStart: number): Promise<Outcome | null> {
  const state = useAccount.getState();
  const head = await readRow<{ rev: number }>('rev', userId);
  const localEpoch = state.epoch ?? '';
  const settings = localSettings(state.settingsAt);
  // Nobody saved since this browser's last sync: send this browser's copy only when it changed.
  if (head.rev === state.rev) {
    if (changesAtStart === state.syncedChanges) return { rev: head.rev, epoch: localEpoch };
    const saved = await writeRow(userId, head.rev, { data: snapshotProgress(), epoch: localEpoch, settings });
    return saved ? { rev: head.rev + 1, epoch: localEpoch } : null;
  }
  const row = await readRow<ProgressRow>('data, epoch, settings, rev', userId);
  const remote = isProgress(row.data) ? { data: row.data, epoch: row.epoch } : null;
  // A saved row that is not progress: stop rather than overwrite the only other copy.
  if (remote === null && row.rev > 0) throw new AccountError('The progress saved in your account could not be read, so nothing was changed.');
  // The first sync of this browser joins the account's epoch (signing in = combine, not reset).
  const baseEpoch = state.rev === undefined ? row.epoch : localEpoch;
  const local = snapshotProgress();
  const merged = combineProgress(local, baseEpoch, remote);
  const epoch = row.epoch > baseEpoch ? row.epoch : baseEpoch;
  const mergedSettings = newerSettings(settings, row.settings ?? undefined) ?? settings;
  if (!sameProgress(merged, local)) applyProgress(merged);
  if (mergedSettings !== settings) {
    applySettings(mergedSettings);
    useAccount.setState({ settingsAt: mergedSettings.updatedAt });
  }
  const unchanged = remote !== null && sameProgress(merged, remote.data) && epoch === row.epoch && stableStringify(mergedSettings) === stableStringify(row.settings);
  if (unchanged) return { rev: row.rev, epoch };
  const saved = await writeRow(userId, row.rev, { data: merged, epoch, settings: mergedSettings });
  return saved ? { rev: row.rev + 1, epoch } : null;
}

async function runSync(): Promise<void> {
  const { user, changes } = useAccount.getState();
  if (!user) return;
  useAccount.setState({ status: 'syncing' });
  try {
    const supabase = await getSupabase();
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new AccountError(SESSION_ENDED, 'session');
    const attempts = Array.from({ length: MAX_SAVE_ATTEMPTS });
    const outcome = await attempts.reduce<Promise<Outcome | null>>(async (previous) => (await previous) ?? syncOnce(user.id, changes), Promise.resolve(null));
    if (!outcome) throw new AccountError('Another device kept saving at the same time. Try again in a moment.');
    useAccount.setState({ ...outcome, syncedChanges: changes, status: 'ok', error: undefined, errorKind: undefined, lastSyncedAt: new Date().toISOString() });
  } catch (e) {
    const error = e instanceof AccountError ? e : accountError(e instanceof Error ? e : { message: String(e) });
    useAccount.setState({ status: 'error', error: error.message, errorKind: error.kind });
  }
}

/** Syncs now (one at a time; a request that comes in meanwhile runs once more afterwards). */
export async function accountSyncNow(mode: AccountSyncMode = 'merge'): Promise<void> {
  if (!isSignedIn()) return;
  // Import / Reset: a new epoch wins over the other devices' older progress (see sync.ts).
  if (mode === 'replace') useAccount.setState((s) => ({ epoch: new Date().toISOString(), changes: s.changes + 1 }));
  if (sync.running) {
    sync.pending = true;
    await sync.running;
    return;
  }
  sync.running = runSync();
  await sync.running;
  sync.running = null;
  const again = sync.pending;
  sync.pending = false;
  if (again) await accountSyncNow();
}

/** Mounted once in the app layout: syncs on start, a few seconds after changes and when the app is hidden or shown. */
export function useAccountSync(): void {
  const signedIn = useAccount((s) => Boolean(s.user));
  useEffect(() => {
    if (!signedIn) return undefined;
    void accountSyncNow();
    const timer: { id?: number } = {};
    const onChange = (isSettings: boolean) => (): void => {
      if (sync.applying) return;
      useAccount.setState((s) => ({ changes: s.changes + 1, ...(isSettings ? { settingsAt: new Date().toISOString() } : {}) }));
      window.clearTimeout(timer.id);
      timer.id = window.setTimeout(() => void accountSyncNow(), SYNC_DELAY_MS);
    };
    const unsubscribe = [useProgress.subscribe(onChange(false)), useSettings.subscribe(onChange(true)), useDailyGoal.subscribe(onChange(true))];
    const onVisibility = (): void => {
      window.clearTimeout(timer.id);
      void accountSyncNow();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      unsubscribe.forEach((stop) => stop());
      window.clearTimeout(timer.id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [signedIn]);
}
