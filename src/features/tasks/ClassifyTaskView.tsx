import { useMemo, useState } from 'react';
import type { ClassifyTask } from '../../content/schema';
import { useProgress } from '../progress/store';
import { Markdown } from '../../components/Markdown';
import { Callout } from '../../components/ui';
import { hashString, mulberry32, shuffle } from '../../lib/random';
import { ExplanationPanel, HintsPanel, NextActions } from './shared';
import type { TaskViewProps } from './types';

type Item = ClassifyTask['items'][number];

/** Large prime that spreads seeds apart so every retry draws a visibly different set. */
const SEED_SPREAD = 104729;
const PERCENT = 100;

function pickItems(task: ClassifyTask, id: string, seed: number): Item[] {
  const rng = mulberry32(hashString(id) + seed * SEED_SPREAD);
  const count = Math.min(task.show ?? task.items.length, task.items.length);
  return shuffle(task.items, rng).slice(0, count);
}

function optionTone(isChosen: boolean, isCorrect: boolean, submitted: boolean): string {
  if (!submitted) return isChosen ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-fg hover:border-accent/60';
  if (isCorrect) return 'border-ok/60 bg-ok-soft text-ok';
  if (isChosen) return 'border-bad/60 bg-bad-soft text-bad line-through';
  return 'border-line bg-surface text-faint';
}

export function ClassifyTaskView({ ct, seed, header, onSimilar, next }: TaskViewProps) {
  const task = ct.task as ClassifyTask;
  const recordAttempt = useProgress((s) => s.recordAttempt);
  const failed = useProgress((s) => s.tasks[ct.id]?.failedAttempts ?? 0);
  const items = useMemo(() => pickItems(task, ct.id, seed), [task, ct.id, seed]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const labelOf = (categoryId: string): string => task.categories.find((c) => c.id === categoryId)?.label ?? categoryId;
  const correctCount = items.filter((it) => answers[it.id] === it.category).length;
  const passed = correctCount / items.length >= task.passScore;
  const allAnswered = items.every((it) => answers[it.id] !== undefined);
  const hasDescriptions = task.categories.some((c) => c.description);

  const submit = (): void => {
    setSubmitted(true);
    recordAttempt(ct.id, passed);
    document.getElementById('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-7 lg:px-8">
      {header}
      {seed > 0 && <div className="chip chip-accent mb-3">New set #{seed}</div>}
      <Markdown>{task.statement}</Markdown>
      <p className="mt-2 text-sm text-muted">
        {items.length} items · pass mark {Math.round(task.passScore * PERCENT)}%
        {task.items.length > items.length && ` · a retry draws a new set from ${task.items.length} items`}
      </p>

      {hasDescriptions && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {task.categories.map((c) => (
            <div key={c.id} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
              <div className="font-semibold">{c.label}</div>
              {c.description && <div className="mt-0.5 text-muted">{c.description}</div>}
            </div>
          ))}
        </div>
      )}

      {submitted && (
        <div className="mt-5 space-y-3">
          <Callout tone={passed ? 'ok' : 'bad'} title={passed ? `Passed: ${correctCount}/${items.length} 🎉` : `Not yet: ${correctCount}/${items.length}`}>
            {passed
              ? 'Read the explanations below — they are the most valuable part.'
              : 'Read why each wrong item belongs to another category, then try a new set.'}
          </Callout>
          <NextActions passed={passed} onSimilar={onSimilar} similarLabel="New set of items" next={next} />
        </div>
      )}

      <div className="mt-6 space-y-3">
        {items.map((it, n) => {
          const chosen = answers[it.id];
          const ok = chosen === it.category;
          return (
            <div key={it.id} className={`card p-4 ${submitted && ok ? 'border-ok/50' : ''} ${submitted && !ok ? 'border-bad/50' : ''}`}>
              <div className="flex items-start gap-3">
                <span className="pt-0.5 text-sm font-semibold tabular-nums text-faint">{n + 1}.</span>
                <Markdown compact className="min-w-0 flex-1 [&_p]:my-0">
                  {it.text}
                </Markdown>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 pl-7" role="radiogroup" aria-label={`Category for item ${n + 1}`}>
                {task.categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={chosen === c.id}
                    disabled={submitted}
                    onClick={() => setAnswers((prev) => ({ ...prev, [it.id]: c.id }))}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${optionTone(chosen === c.id, c.id === it.category, submitted)}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              {submitted && (!ok || it.explain) && (
                <div className="mt-3 rounded-lg bg-hover px-3 py-2 pl-7 text-sm">
                  {!ok && (
                    <div className="mb-1 font-semibold text-bad">
                      Correct: {labelOf(it.category)}
                    </div>
                  )}
                  {it.explain && <Markdown compact>{it.explain}</Markdown>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 space-y-4">
        {!submitted && (
          <button className="btn btn-primary" disabled={!allAnswered} onClick={submit}>
            Check answers
          </button>
        )}
        {task.explanation && (failed > 0 || (submitted && passed)) && <ExplanationPanel text={task.explanation} />}
        <HintsPanel taskId={ct.id} hints={task.hints} />
      </div>
    </div>
  );
}
