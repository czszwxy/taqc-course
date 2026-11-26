import { useState, type FormEvent, type ReactElement } from 'react';
import { Callout } from '../../components/ui';
import { connectSync, disconnectSync, syncNow, useSync } from './sync';

/** Settings section: connect this device to the progress gist, see the sync status, sync now or disconnect. */

/** Opens GitHub's "new token" page with the description and the single "gist" permission already filled in. */
const NEW_TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=my-university%20progress%20sync';
const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;

export function ago(iso: string | undefined): string {
  if (!iso) return 'not yet';
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / MS_PER_MINUTE);
  if (minutes < 1) return 'just now';
  if (minutes < MINUTES_PER_HOUR) return `${minutes} min ago`;
  return new Date(iso).toLocaleString();
}

export function SyncSection(): ReactElement {
  const { token, login, lastSyncedAt, status, error } = useSync();
  const [input, setInput] = useState('');
  const connected = Boolean(token);
  const busy = status === 'syncing';

  const connect = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!input.trim()) return;
    await connectSync(input);
    setInput('');
  };

  const disconnect = (): void => {
    if (confirm('Stop syncing on this device? Your progress here and the copy on GitHub both stay.')) disconnectSync();
  };

  return (
    <section className="card mt-4 p-5">
      <h2 className="font-display text-lg font-bold">Sync between devices</h2>
      {connected ? (
        <>
          <p className="mt-1 text-sm text-muted">
            ☁️ Connected to GitHub as <b className="text-fg">@{login}</b>. Progress syncs by itself: a few seconds after a change, when you open the course and
            when you leave it. A task solved on any device stays solved.
          </p>
          <p className="mt-2 text-sm">
            {busy ? '⏳ Syncing…' : `Last sync: ${ago(lastSyncedAt)}`}
          </p>
          {status === 'error' && error && (
            <div className="mt-3">
              <Callout tone="bad">{error}</Callout>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={() => void syncNow()} disabled={busy}>
              ↻ Sync now
            </button>
            <button className="btn btn-ghost" onClick={disconnect}>
              Disconnect this device
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            Keep the same progress on your computer and your phone. It is stored in a secret gist (a private note) in your GitHub account. Do this once on each
            device:
          </p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
            <li>
              Open{' '}
              <a className="text-accent-fg underline" href={NEW_TOKEN_URL} target="_blank" rel="noopener noreferrer">
                Create a GitHub token
              </a>{' '}
              (sign in to GitHub if asked). Only the <b>gist</b> box is ticked — keep it that way. Choose an expiration (for example 1 year).
            </li>
            <li>
              Press <b>Generate token</b> and copy it (it starts with <code>ghp_</code>). GitHub shows it only once — you can use the same token on both devices.
            </li>
            <li>Paste it below and press Connect.</li>
          </ol>
          <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => void connect(e)}>
            <input
              type="password"
              className="input min-w-0 flex-1"
              placeholder="ghp_…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-label="GitHub token"
            />
            <button className="btn btn-primary" type="submit" disabled={busy || !input.trim()}>
              {busy ? 'Connecting…' : 'Connect'}
            </button>
          </form>
          {status === 'error' && error && (
            <div className="mt-3">
              <Callout tone="bad">{error}</Callout>
            </div>
          )}
          <p className="mt-3 text-xs text-faint">
            The token is saved only in this browser and is not part of exported progress files. It can only read and write your gists; you can delete it on
            GitHub any time (Settings → Developer settings → Personal access tokens).
          </p>
        </>
      )}
    </section>
  );
}
