import { useEffect, useRef, useState } from 'react';
import deal from './data/deal.json';
import { PlaygroundShell, formatUah, isFixedMode, withLabMode } from './PlaygroundShell';

/**
 * Bug Playground: Gadgetly "Deal of the day" — practice page of module 33 for things a test cannot wait for or
 * cannot do by hand: time (a countdown, a toast that hides itself — page.clock), the network going offline
 * (context.setOffline), geolocation with and without permission, and the browser's time zone.
 * A deal lasts until the next round 5 minutes of the clock (12:00, 12:05 …), so tests with a fake clock are exact.
 * 8 INTENTIONAL bugs below. Open with `?fixed` for the correct version.
 * Keep the flags in sync with `bugIds` in registry.ts (same order) and with the tasks.
 */

function getBugs(fixed: boolean) {
  const on = !fixed;
  return {
    timerFormat: on, // seconds are not zero-padded: "04:5" instead of "04:05"
    buyAfterEnd: on, // "Buy now" stays enabled after the deal ended
    endedPrice: on, // the deal price is still shown after the deal ended
    toastStays: on, // the "Added to cart" toast never disappears
    offlineBuy: on, // "Buy now" stays enabled while the browser is offline
    geoDenied: on, // when location access is denied the page shows "Locating…" forever
    nearestWrong: on, // the nearest store is picked by latitude only
    endTimeUtc: on, // "Deal ends at" is shown in UTC instead of the user's time zone
  };
}

const PRODUCT = deal.product;
const STORES = deal.stores;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const DEAL_WINDOW_MS = deal.dealMinutes * SECONDS_PER_MINUTE * MS_PER_SECOND;
const TWO_DIGITS = 2;
const DEGREES_PER_HALF_TURN = 180;

const MSG = {
  offline: 'You are offline. Reconnect to buy.',
  locating: 'Locating…',
  denied: 'Location access denied. Choose a store from the list.',
};

/** The deal ends at the next round "window" of the clock (…:00, …:05, …:10 for 5-minute deals). */
function dealEnd(now: number): number {
  return Math.floor(now / DEAL_WINDOW_MS) * DEAL_WINDOW_MS + DEAL_WINDOW_MS;
}

const pad = (n: number): string => String(n).padStart(TWO_DIGITS, '0');

function timerText(secondsLeft: number, padSeconds: boolean): string {
  const minutes = Math.floor(secondsLeft / SECONDS_PER_MINUTE);
  const seconds = secondsLeft % SECONDS_PER_MINUTE;
  return `${pad(minutes)}:${padSeconds ? pad(seconds) : seconds}`;
}

function endTimeText(endAt: number, inUtc: boolean): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', ...(inUtc ? { timeZone: 'UTC' } : {}) }).format(endAt);
}

type Store = (typeof STORES)[number];

/** Distance on a flat map (degrees), good enough to compare cities of one country. */
function distanceTo(store: Store, latitude: number, longitude: number, latitudeOnly: boolean): number {
  const dLat = store.latitude - latitude;
  if (latitudeOnly) return Math.abs(dLat);
  const dLon = (store.longitude - longitude) * Math.cos((latitude * Math.PI) / DEGREES_PER_HALF_TURN);
  return Math.hypot(dLat, dLon);
}

function nearestStore(latitude: number, longitude: number, latitudeOnly: boolean): Store | undefined {
  return [...STORES].sort((a, b) => distanceTo(a, latitude, longitude, latitudeOnly) - distanceTo(b, latitude, longitude, latitudeOnly))[0];
}

type StoreState = { kind: 'idle' } | { kind: 'locating' } | { kind: 'found'; city: string } | { kind: 'denied' };

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = (): void => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

/** Current time, re-read a few times per second (a fake clock in tests drives it too). */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), deal.tickMs);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function DealPage() {
  const fixed = isFixedMode();
  const bug = withLabMode(getBugs(fixed));
  const [endAt, setEndAt] = useState(() => dealEnd(Date.now()));
  const now = useNow();
  const online = useOnline();
  const [toast, setToast] = useState<string | null>(null);
  const [store, setStore] = useState<StoreState>({ kind: 'idle' });
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const secondsLeft = Math.max(0, Math.ceil((endAt - now) / MS_PER_SECOND));
  const ended = secondsLeft === 0;
  const price = ended && !bug.endedPrice ? PRODUCT.regularPrice : PRODUCT.dealPrice;
  const blockedByEnd = ended && !bug.buyAfterEnd;
  const blockedByOffline = !online && !bug.offlineBuy;

  const buy = () => {
    setToast(`Added to cart: ${PRODUCT.name} — ${formatUah(price)}`);
    window.clearTimeout(toastTimer.current);
    if (!bug.toastStays) toastTimer.current = window.setTimeout(() => setToast(null), deal.toastMs);
  };

  const findStore = () => {
    setStore({ kind: 'locating' });
    const denied = (): void => {
      if (!bug.geoDenied) setStore({ kind: 'denied' });
    };
    if (!('geolocation' in navigator)) {
      denied();
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      const nearest = nearestStore(position.coords.latitude, position.coords.longitude, bug.nearestWrong);
      setStore(nearest ? { kind: 'found', city: nearest.city } : { kind: 'denied' });
    }, denied);
  };

  const reset = () => {
    window.clearTimeout(toastTimer.current);
    setToast(null);
    setStore({ kind: 'idle' });
    setEndAt(dealEnd(Date.now()));
  };

  const requirements = (
    <>
      <li>
        <b>Deal</b>: {PRODUCT.name} for {formatUah(PRODUCT.dealPrice)} instead of {formatUah(PRODUCT.regularPrice)}. A deal lasts until the next round{' '}
        {deal.dealMinutes} minutes of the clock (12:00, 12:05, 12:10 …).
      </li>
      <li>
        <b>Timer</b> “Ends in” counts down every second in the format <code>mm:ss</code> (for example <code>04:05</code>). “Deal ends at” shows the end time in{' '}
        <b>your time zone</b> (24-hour, <code>HH:MM</code>).
      </li>
      <li>
        When the timer reaches <code>00:00</code>: “Deal ended”, the price returns to {formatUah(PRODUCT.regularPrice)} and <b>Buy now</b> is disabled.
      </li>
      <li>
        <b>Buy now</b> shows “Added to cart: … — price”; the message disappears by itself after {deal.toastMs / MS_PER_SECOND} seconds.
      </li>
      <li>
        <b>Offline</b>: when the connection is lost — “{MSG.offline}” and Buy now is disabled; both return to normal when the connection is back.
      </li>
      <li>
        <b>Find nearest store</b> uses your location: “Nearest store: &lt;city&gt;” — the closest of {STORES.map((s) => s.city).join(', ')}. If location access
        is denied → “{MSG.denied}”
      </li>
    </>
  );

  return (
    <PlaygroundShell brand="gadgetly" fixed={fixed} requirements={requirements} onReset={reset}>
      <h1 className="text-2xl font-bold">Deal of the day</h1>
      {!online && (
        <p role="alert" data-testid="offline-banner" className="mt-3 rounded-md bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900">
          {MSG.offline}
        </p>
      )}

      <section aria-label="Deal" className="mt-4 rounded-lg border border-slate-200 p-5">
        <h2 className="text-lg font-semibold">{PRODUCT.name}</h2>
        <p className="mt-2 flex flex-wrap items-baseline gap-3">
          <span className="text-2xl font-bold" data-testid="deal-price">
            {formatUah(price)}
          </span>
          {!ended && (
            <s className="text-slate-500" data-testid="regular-price">
              {formatUah(PRODUCT.regularPrice)}
            </s>
          )}
        </p>
        {ended ? (
          <p data-testid="deal-ended" className="mt-2 font-semibold text-red-700">
            Deal ended
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-700">
            Ends in{' '}
            <b data-testid="deal-timer" className="tabular-nums">
              {timerText(secondsLeft, !bug.timerFormat)}
            </b>{' '}
            · Deal ends at <b data-testid="deal-end-time">{endTimeText(endAt, bug.endTimeUtc)}</b>
          </p>
        )}
        <button
          type="button"
          onClick={buy}
          disabled={blockedByEnd || blockedByOffline}
          className="mt-4 rounded-md bg-orange-500 px-5 py-2.5 font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Buy now
        </button>
        {toast && (
          <p role="status" data-testid="toast" className="mt-3 inline-block rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800">
            {toast}
          </p>
        )}
      </section>

      <section aria-label="Pick up in store" className="mt-6 rounded-lg border border-slate-200 p-5">
        <h2 className="text-lg font-semibold">Pick up in store</h2>
        <p className="mt-1 text-sm text-slate-600">Our stores: {STORES.map((s) => s.city).join(', ')}.</p>
        <button type="button" onClick={findStore} className="mt-3 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
          Find nearest store
        </button>
        {store.kind === 'locating' && (
          <p role="status" data-testid="store-locating" className="mt-3 text-sm text-slate-600">
            {MSG.locating}
          </p>
        )}
        {store.kind === 'found' && (
          <p role="status" data-testid="store-result" className="mt-3 text-sm font-medium text-emerald-800">
            Nearest store: {store.city}
          </p>
        )}
        {store.kind === 'denied' && (
          <p role="alert" data-testid="store-error" className="mt-3 text-sm text-red-700">
            {MSG.denied}
          </p>
        )}
      </section>
    </PlaygroundShell>
  );
}
