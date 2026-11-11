import { useState } from 'react';
import { PlaygroundShell, formatUah, isFixedMode, withLabMode } from './PlaygroundShell';

/**
 * Bug Playground: Gadgetly order status flow with 5 INTENTIONAL bugs (catalogued in
 * content/modules/06-qa-practice-lab/lessons/07-order-status/tasks/03-bug-hunt/task.json).
 * Open with `?fixed` for the correct implementation. Keep this file and the bug catalog in sync.
 */

type Status = 'Created' | 'Paid' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Returned';
type Action = 'Pay' | 'Ship' | 'Deliver' | 'Cancel' | 'Return';

const ACTIONS: Action[] = ['Pay', 'Ship', 'Deliver', 'Cancel', 'Return'];
const ORDER_TOTAL = 2749;
const ORDER_NUMBER = '#1042';

interface HistoryEntry {
  status: Status;
  note?: string;
}

function getBugs(fixed: boolean) {
  const on = !fixed;
  return {
    shipBeforePay: on, // a Created (unpaid) order can be shipped
    cancelAfterShip: on, // a Shipped order can be cancelled
    payAfterCancel: on, // a Cancelled order can be paid again
    returnRejected: on, // Return is rejected for a Delivered order
    refundNote: on, // cancelling a Paid order does not record the refund
  };
}
type Bugs = ReturnType<typeof getBugs>;

type TransitionMap = Record<Status, Partial<Record<Action, Status>>>;

function transitions(bug: Bugs): TransitionMap {
  return {
    Created: { Pay: 'Paid', Cancel: 'Cancelled', ...(bug.shipBeforePay ? { Ship: 'Shipped' as const } : {}) },
    Paid: { Ship: 'Shipped', Cancel: 'Cancelled' },
    Shipped: { Deliver: 'Delivered', ...(bug.cancelAfterShip ? { Cancel: 'Cancelled' as const } : {}) },
    Delivered: bug.returnRejected ? {} : { Return: 'Returned' },
    Cancelled: bug.payAfterCancel ? { Pay: 'Paid' } : {},
    Returned: {},
  };
}

function noteFor(from: Status, to: Status, bug: Bugs): string | undefined {
  const refund = from === 'Paid' && to === 'Cancelled' && !bug.refundNote;
  return refund ? `Refund of ${formatUah(ORDER_TOTAL)} issued` : undefined;
}

const STATUS_STYLE: Record<Status, string> = {
  Created: 'bg-slate-200 text-slate-800',
  Paid: 'bg-sky-100 text-sky-800',
  Shipped: 'bg-indigo-100 text-indigo-800',
  Delivered: 'bg-emerald-100 text-emerald-800',
  Cancelled: 'bg-red-100 text-red-800',
  Returned: 'bg-amber-100 text-amber-800',
};

const INITIAL_HISTORY: HistoryEntry[] = [{ status: 'Created' }];

export function OrderPage() {
  const fixed = isFixedMode();
  const bug = withLabMode(getBugs(fixed));
  const [history, setHistory] = useState<HistoryEntry[]>(INITIAL_HISTORY);
  const [error, setError] = useState<string | null>(null);

  const status = history[history.length - 1]?.status ?? 'Created';

  const act = (action: Action) => {
    const next = transitions(bug)[status][action];
    if (!next) {
      setError(`${action} is not allowed for an order in status ${status}`);
      return;
    }
    setError(null);
    setHistory((prev) => [...prev, { status: next, note: noteFor(status, next, bug) }]);
  };

  const reset = () => {
    setHistory(INITIAL_HISTORY);
    setError(null);
  };

  const requirements = (
    <>
      <li>
        Allowed transitions:
        <ul className="mt-1 list-[circle] space-y-0.5 pl-5">
          <li>Created → Pay → Paid; Created → Cancel → Cancelled</li>
          <li>Paid → Ship → Shipped; Paid → Cancel → Cancelled</li>
          <li>Shipped → Deliver → Delivered</li>
          <li>Delivered → Return → Returned</li>
        </ul>
      </li>
      <li>
        <b>Cancelled</b> and <b>Returned</b> are final: no further actions.
      </li>
      <li>
        Any other action → “&lt;Action&gt; is not allowed for an order in status &lt;Status&gt;”; the status does not change and nothing is added to
        the history.
      </li>
      <li>
        Cancelling a <b>Paid</b> order issues a refund: the history entry says “Refund of 2,749 UAH issued”.
      </li>
      <li>Every successful action adds a line to the history (newest at the bottom).</li>
    </>
  );

  return (
    <PlaygroundShell brand="gadgetly" fixed={fixed} requirements={requirements} onReset={reset}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Order {ORDER_NUMBER}</h1>
        <span data-testid="order-status" className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[status]}`}>
          {status}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Laptop Air 13 sleeve × 1, Wireless Headphones H1 × 1 — total <b>{formatUah(ORDER_TOTAL)}</b>
      </p>

      <div className="mt-6">
        <div className="text-sm font-medium text-slate-700">Actions (admin panel)</div>
        <div className="mt-2 flex flex-wrap gap-2" data-testid="order-actions">
          {ACTIONS.map((a) => (
            <button
              key={a}
              type="button"
              data-testid={`action-${a.toLowerCase()}`}
              onClick={() => act(a)}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              {a}
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" data-testid="order-error" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>

      <div className="mt-6">
        <div className="text-sm font-medium text-slate-700">History</div>
        <ol className="mt-2 space-y-1.5 text-sm" data-testid="order-history">
          {history.map((h, i) => (
            <li key={`${h.status}-${i}`} className="flex flex-wrap items-center gap-2">
              <span className="w-6 text-right text-slate-400">{i + 1}.</span>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[h.status]}`}>{h.status}</span>
              {h.note && (
                <span className="text-slate-600" data-testid="history-note">
                  {h.note}
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </PlaygroundShell>
  );
}
