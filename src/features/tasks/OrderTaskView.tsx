import { useMemo, useState } from 'react';
import type { OrderTask } from '../../content/schema';
import { useProgress } from '../progress/store';
import { Markdown } from '../../components/Markdown';
import { Callout } from '../../components/ui';
import { hashString, mulberry32, shuffle } from '../../lib/random';
import { Collapsible, ExplanationPanel, HintsPanel, NextActions } from './shared';
import type { TaskViewProps } from './types';

/** Large prime that spreads seeds apart so every retry starts from a different shuffle. */
const SEED_SPREAD = 7919;
/** The correct order can be revealed after this many failed checks (or earlier with a confirmation). */
const REVEAL_AFTER_FAILS = 2;

/** Shuffled indexes of the items; never returns the already-correct order. */
function initialOrder(count: number, id: string, seed: number): number[] {
  const identity = Array.from({ length: count }, (_, i) => i);
  const shuffled = shuffle(identity, mulberry32(hashString(id) + seed * SEED_SPREAD));
  const unchanged = shuffled.every((v, i) => v === i);
  return unchanged ? [...shuffled.slice(1), shuffled[0]] : shuffled;
}

/** Returns a copy of `list` with the elements at positions `a` and `b` swapped. */
function swap(list: number[], a: number, b: number): number[] {
  const copy = [...list];
  [copy[a], copy[b]] = [copy[b], copy[a]];
  return copy;
}

function rowTone(checked: boolean, inPlace: boolean): string {
  if (!checked) return 'border-line bg-surface';
  return inPlace ? 'border-ok/60 bg-ok-soft' : 'border-bad/60 bg-bad-soft';
}

export function OrderTaskView({ ct, seed, header, onSimilar, next }: TaskViewProps) {
  const task = ct.task as OrderTask;
  const recordAttempt = useProgress((s) => s.recordAttempt);
  const failed = useProgress((s) => s.tasks[ct.id]?.failedAttempts ?? 0);
  const solved = useProgress((s) => s.tasks[ct.id]?.status === 'solved');
  const markSolutionViewed = useProgress((s) => s.markSolutionViewed);
  const start = useMemo(() => initialOrder(task.items.length, ct.id, seed), [task.items.length, ct.id, seed]);
  const [order, setOrder] = useState<number[]>(start);
  const [checked, setChecked] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const inPlaceCount = order.filter((itemIndex, position) => itemIndex === position).length;
  const passed = inPlaceCount === order.length;

  const move = (position: number, delta: number): void => {
    const target = position + delta;
    if (target < 0 || target >= order.length) return;
    setOrder((prev) => swap(prev, position, target));
    setChecked(false);
  };

  const check = (): void => {
    setChecked(true);
    recordAttempt(ct.id, passed);
  };

  const revealAnswer = (): void => {
    if (!solved && failed < REVEAL_AFTER_FAILS && !confirm('Try a couple of times before looking at the answer. Show it anyway?')) return;
    markSolutionViewed(ct.id);
    setShowAnswer(true);
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-7 lg:px-8">
      {header}
      {seed > 0 && <div className="chip chip-accent mb-3">Reshuffled #{seed}</div>}
      <Markdown>{task.statement}</Markdown>
      <p className="mt-2 text-sm text-muted">Use the ▲ ▼ buttons to move steps. The first step goes on top.</p>

      <ol className="mt-5 space-y-2">
        {order.map((itemIndex, position) => (
          <li key={itemIndex} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${rowTone(checked, itemIndex === position)}`}>
            <span className="w-6 text-center text-sm font-semibold tabular-nums text-faint">{position + 1}</span>
            <Markdown compact className="min-w-0 flex-1 [&_p]:my-0">
              {task.items[itemIndex]}
            </Markdown>
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                className="btn btn-ghost btn-sm px-2 py-0.5"
                onClick={() => move(position, -1)}
                disabled={position === 0 || (checked && passed)}
                aria-label={`Move step ${position + 1} up`}
              >
                ▲
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm px-2 py-0.5"
                onClick={() => move(position, 1)}
                disabled={position === order.length - 1 || (checked && passed)}
                aria-label={`Move step ${position + 1} down`}
              >
                ▼
              </button>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-5 space-y-3">
        {!(checked && passed) && (
          <button className="btn btn-primary" onClick={check}>
            Check order
          </button>
        )}
        {checked && (
          <Callout tone={passed ? 'ok' : 'bad'} title={passed ? 'Correct order! 🎉' : `${inPlaceCount} of ${order.length} steps are in the right place`}>
            {passed ? 'Every step is where it belongs.' : 'Green rows are already correct. Move the red ones and check again.'}
          </Callout>
        )}
        {checked && <NextActions passed={passed} onSimilar={onSimilar} similarLabel="Reshuffle and practise again" next={next} />}
        {task.explanation && (failed > 0 || (checked && passed)) && <ExplanationPanel text={task.explanation} />}
        <HintsPanel taskId={ct.id} hints={task.hints} />
        {showAnswer ? (
          <Collapsible title="📗 Correct order" defaultOpen>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {task.items.map((it) => (
                <li key={it}>
                  <Markdown compact>{it}</Markdown>
                </li>
              ))}
            </ol>
          </Collapsible>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={revealAnswer}>
            👀 Show correct order
          </button>
        )}
      </div>
    </div>
  );
}
