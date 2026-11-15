import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { snapshotProgress, useProgress, type ProgressData } from '../progress/store';
import { fetchLogin, findOrCreateGist, readGist, SyncError, writeGist } from './gist';
import { mergeProgress, sameProgress } from './merge';

/**
 * Progress sync between devices (the course on the computer, the website on the phone) through one secret GitHub gist.
 * Each sync reads the gist, merges it with this device's progress (nothing is lost — see merge.ts), saves the result
 * here and writes it back when it changed. It runs on start, a few seconds after every change and whenever the app
 * is hidden or shown again. The token stays in this browser only and is never part of an exported progress file.
 */

const SYNC_KEY = 'my-university:sync';
const APP_ID = 'my-university';
const FILE_VERSION = 1;
/** Waits this long after the last change, so a burst of changes becomes one write. */
const SYNC_DELAY_MS = 8_000;

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error';
/** merge = combine both sides (normal); replace = this device's progress overwrites the cloud copy (import / reset). */
export type SyncMode = 'merge' | 'replace';

interface SyncState {
  token?: string;
  gistId?: string;
  login?: string;
  lastSyncedAt?: string;
  status: SyncStatus;
  error?: string;
}

export const useSync = create<SyncState>()(
  persist((): SyncState => ({ status: 'idle' }), {
    name: SYNC_KEY,
    version: 1,
    partialize: (s) => ({ token: s.token, gistId: s.gistId, login: s.login, lastSyncedAt: s.lastSyncedAt }),
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
  data: ProgressData;
}

function toFile(data: ProgressData): string {
  const file: SyncFile = { app: APP_ID, version: FILE_VERSION, savedAt: new Date().toISOString(), data };
  return JSON.stringify(file);
}

function fromFile(text: string): ProgressData | null {
  try {
    const file = JSON.parse(text) as Partial<SyncFile>;
    return file.app === APP_ID && file.data && typeof file.data.tasks === 'object' ? file.data : null;
  } catch {
    return null;
  }
}

/** One sync at a time; a request that comes in meanwhile runs once more afterwards (replace wins over merge). */
const queue: { running: Promise<void> | null; pending: SyncMode | null; applying: boolean } = { running: null, pending: null, applying: false };

function applyLocally(data: ProgressData): void {
  // Our own update of the progress store must not schedule yet another sync.
  queue.applying = true;
  useProgress.getState().importData(data);
  queue.applying = false;
}

async function runSync(mode: SyncMode): Promise<void> {
  const { token, gistId } = useSync.getState();
  if (!token || !gistId) return;
  useSync.setState({ status: 'syncing' });
  try {
    const remoteText = await readGist(token, gistId);
    // The gist was deleted on GitHub: start a new one from this device's progress.
    const activeGist = remoteText === null ? await findOrCreateGist(token, toFile(snapshotProgress())) : gistId;
    const remote = remoteText === null ? null : fromFile(remoteText);
    const local = snapshotProgress();
    const merged = mode === 'replace' || remote === null ? local : mergeProgress(local, remote);
    if (!sameProgress(merged, local)) applyLocally(merged);
    if (remote === null || !sameProgress(merged, remote)) await writeGist(token, activeGist, toFile(merged));
    useSync.setState({ gistId: activeGist, status: 'ok', error: undefined, lastSyncedAt: new Date().toISOString() });
  } catch (e) {
    useSync.setState({ status: 'error', error: e instanceof SyncError ? e.message : String(e) });
  }
}

export async function syncNow(mode: SyncMode = 'merge'): Promise<void> {
  if (!isSyncConnected()) return;
  if (queue.running) {
    queue.pending = queue.pending === 'replace' ? 'replace' : mode;
    await queue.running;
    return;
  }
  queue.running = runSync(mode);
  await queue.running;
  queue.running = null;
  const next = queue.pending;
  queue.pending = null;
  if (next) await syncNow(next);
}

/** Checks the token, finds or creates the progress gist and merges this device's progress with it. */
export async function connectSync(token: string): Promise<void> {
  const trimmed = token.trim();
  useSync.setState({ status: 'syncing', error: undefined });
  try {
    const login = await fetchLogin(trimmed);
    const gistId = await findOrCreateGist(trimmed, toFile(snapshotProgress()));
    useSync.setState({ token: trimmed, gistId, login });
  } catch (e) {
    useSync.setState({ status: 'error', error: e instanceof SyncError ? e.message : String(e) });
    return;
  }
  await syncNow('merge');
}

/** Forgets the token on this device. The gist and the progress on GitHub stay. */
export function disconnectSync(): void {
  useSync.setState({ token: undefined, gistId: undefined, login: undefined, lastSyncedAt: undefined, status: 'idle', error: undefined });
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
