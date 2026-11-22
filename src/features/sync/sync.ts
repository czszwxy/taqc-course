import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { snapshotProgress, useProgress, type ProgressData } from '../progress/store';
import { fetchLogin, findOrCreateGist, readGist, SyncError, writeGist } from './gist';
import { changesSince, mergeProgress, sameProgress } from './merge';

/**
 * Progress sync between devices (the course on the computer, the website on the phone) through one secret GitHub gist.
 * Each sync reads the gist, merges it with this device's progress (nothing is lost — see merge.ts), saves the result
 * here and writes it back when it changed. It runs on start, a few seconds after every change and whenever the app
 * is hidden or shown again. The token stays in this browser only and is never part of an exported progress file.
 *
 * Reset and Import must win over the other devices, which still have the old progress and would merge it back.
 * So they start a new **epoch** (the time of the reset): a device that sees a newer epoch in the gist takes the gist's
 * progress and keeps only its own changes made after that moment (changesSince in merge.ts).
 */

const SYNC_KEY = 'my-university:sync';
const APP_ID = 'my-university';
const FILE_VERSION = 1;
/** Waits this long after the last change, so a burst of changes becomes one write. */
const SYNC_DELAY_MS = 8_000;

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error';
/** merge = combine both sides (normal); replace = this device's progress overwrites the cloud copy and the other devices (import / reset). */
export type SyncMode = 'merge' | 'replace';

interface SyncState {
  token?: string;
  gistId?: string;
  login?: string;
  lastSyncedAt?: string;
  /** Time of the last reset / import this device's progress is based on (see the epoch note above). */
  epoch?: string;
  status: SyncStatus;
  error?: string;
}

export const useSync = create<SyncState>()(
  persist((): SyncState => ({ status: 'idle' }), {
    name: SYNC_KEY,
    version: 1,
    partialize: (s) => ({ token: s.token, gistId: s.gistId, login: s.login, lastSyncedAt: s.lastSyncedAt, epoch: s.epoch }),
  }),
);

export function isSyncConnected(): boolean {
  const { token, gistId } = useSync.getState();
  return Boolean(token && gistId);
}

interface SyncFile {
  app: string;
  version: number;
  savedAt: string;
  epoch?: string;
  data: ProgressData;
}

interface RemoteProgress {
  data: ProgressData;
  /** '' when nobody has reset or imported yet. */
  epoch: string;
}

function toFile(data: ProgressData, epoch: string | undefined): string {
  const file: SyncFile = { app: APP_ID, version: FILE_VERSION, savedAt: new Date().toISOString(), ...(epoch ? { epoch } : {}), data };
  return JSON.stringify(file);
}

function fromFile(text: string | null): RemoteProgress | null {
  if (text === null) return null;
  try {
    const file = JSON.parse(text) as Partial<SyncFile>;
    return file.app === APP_ID && file.data && typeof file.data.tasks === 'object' ? { data: file.data, epoch: file.epoch ?? '' } : null;
  } catch {
    return null;
  }
}

/** One sync at a time; a request that comes in meanwhile runs once more afterwards. */
const queue: { running: Promise<void> | null; pending: boolean; applying: boolean } = { running: null, pending: false, applying: false };

function applyLocally(data: ProgressData): void {
  // Our own update of the progress store must not schedule yet another sync.
  queue.applying = true;
  useProgress.getState().importData(data);
  queue.applying = false;
}

/** Combines this device's progress with the gist's, honouring a reset / import on either side (the newer epoch wins). */
function combine(local: ProgressData, localEpoch: string, remote: RemoteProgress | null): ProgressData {
  if (remote === null) return local;
  // Another device reset / imported after this one last synced: follow it, keep only the work done here since then.
  if (remote.epoch > localEpoch) return mergeProgress(remote.data, changesSince(local, remote.epoch));
  // This device reset / imported: the cloud copy keeps only what the other devices did after that moment.
  if (localEpoch > remote.epoch) return mergeProgress(local, changesSince(remote.data, localEpoch));
  return mergeProgress(local, remote.data);
}

async function runSync(): Promise<void> {
  const { token, gistId, epoch } = useSync.getState();
  if (!token || !gistId) return;
  useSync.setState({ status: 'syncing' });
  try {
    const savedText = await readGist(token, gistId);
    // The gist was deleted on GitHub: use the one another device may have created meanwhile (and read it — it can
    // hold that device's newer progress or a reset), or start a new one from this device's progress.
    const activeGist = savedText === null ? await findOrCreateGist(token, toFile(snapshotProgress(), epoch)) : gistId;
    const remoteText = savedText === null ? await readGist(token, activeGist) : savedText;
    const remote = fromFile(remoteText);
    // There is a file, but it is not readable progress: stop rather than overwrite the only other copy with this device's.
    if (remoteText !== null && remote === null) {
      throw new SyncError('The progress file on GitHub could not be read, so nothing was changed. Try again later.', 'other');
    }
    const localEpoch = epoch ?? '';
    const nextEpoch = remote && remote.epoch > localEpoch ? remote.epoch : localEpoch;
    const local = snapshotProgress();
    const merged = combine(local, localEpoch, remote);
    if (!sameProgress(merged, local)) applyLocally(merged);
    const unchanged = remote !== null && remote.epoch === nextEpoch && sameProgress(merged, remote.data);
    if (!unchanged) await writeGist(token, activeGist, toFile(merged, nextEpoch || undefined));
    useSync.setState({ gistId: activeGist, epoch: nextEpoch || undefined, status: 'ok', error: undefined, lastSyncedAt: new Date().toISOString() });
  } catch (e) {
    useSync.setState({ status: 'error', error: e instanceof SyncError ? e.message : String(e) });
  }
}

export async function syncNow(mode: SyncMode = 'merge'): Promise<void> {
  if (!isSyncConnected()) return;
  // A reset / import starts a new epoch right away (it is saved), so it still wins when this sync fails (offline).
  if (mode === 'replace') useSync.setState({ epoch: new Date().toISOString() });
  if (queue.running) {
    queue.pending = true;
    await queue.running;
    return;
  }
  queue.running = runSync();
  await queue.running;
  queue.running = null;
  const again = queue.pending;
  queue.pending = false;
  if (again) await syncNow();
}

/** Checks the token, finds or creates the progress gist and merges this device's progress with it. */
export async function connectSync(token: string): Promise<void> {
  const trimmed = token.trim();
  useSync.setState({ status: 'syncing', error: undefined });
  try {
    const login = await fetchLogin(trimmed);
    const gistId = await findOrCreateGist(trimmed, toFile(snapshotProgress(), undefined));
    // Connecting combines both sides: this device joins the gist's epoch instead of being wiped by an older reset.
    const remote = fromFile(await readGist(trimmed, gistId));
    useSync.setState({ token: trimmed, gistId, login, epoch: remote?.epoch || undefined });
  } catch (e) {
    useSync.setState({ status: 'error', error: e instanceof SyncError ? e.message : String(e) });
    return;
  }
  await syncNow('merge');
}

/** Forgets the token on this device. The gist and the progress on GitHub stay. */
export function disconnectSync(): void {
  useSync.setState({ token: undefined, gistId: undefined, login: undefined, lastSyncedAt: undefined, epoch: undefined, status: 'idle', error: undefined });
}

/** Mounted once in the app layout: syncs on start, after changes and when the app is hidden or shown again. */
export function useAutoSync(): void {
  const connected = useSync((s) => Boolean(s.token && s.gistId));
  useEffect(() => {
    if (!connected) return undefined;
    void syncNow();
    const timer: { id?: number } = {};
    const unsubscribe = useProgress.subscribe(() => {
      if (queue.applying) return;
      window.clearTimeout(timer.id);
      timer.id = window.setTimeout(() => void syncNow(), SYNC_DELAY_MS);
    });
    // Hidden: save before the phone suspends the page. Shown again: pick up what the other device did meanwhile.
    const onVisibility = (): void => {
      window.clearTimeout(timer.id);
      void syncNow();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      unsubscribe();
      window.clearTimeout(timer.id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [connected]);
}
