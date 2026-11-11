import { useMemo, useState } from 'react';
import type { SelectorTask } from '../../content/schema';
import { useProgress } from '../progress/store';
import { Markdown } from '../../components/Markdown';
import { Callout } from '../../components/ui';
import { Collapsible, ExplanationPanel, HintsPanel, NextActions } from './shared';
import { checkChallenge, displaySource, prepareSnippet, previewDocument, runSelector, type ChallengeResult } from './selectors';
import type { TaskViewProps } from './types';

/** Reference selectors can be revealed after this many failed checks (or earlier with a confirmation). */
const REVEAL_AFTER_FAILS = 2;

const SYNTAX_LABEL: Record<SelectorTask['syntax'], { name: string; placeholder: string }> = {
  css: { name: 'CSS selector', placeholder: 'e.g. .product-card h3' },
  xpath: { name: 'XPath', placeholder: 'e.g. //div[@class="product-card"]//h3' },
};

const RESULT_TONE: Record<ChallengeResult['status'], string> = {
  correct: 'border-ok/60 bg-ok-soft',
  wrong: 'border-bad/60 bg-bad-soft',
  invalid: 'border-bad/60 bg-bad-soft',
  rule: 'border-warn/60 bg-warn-soft',
};

function matchesLabel(value: string, count: number | null): string {
  if (value.trim() === '') return '—';
  if (count === null) return 'invalid';
  return `${count} ${count === 1 ? 'match' : 'matches'}`;
}

export function SelectorTaskView({ ct, header, onSimilar, next }: TaskViewProps) {
  const task = ct.task as SelectorTask;
  const recordAttempt = useProgress((s) => s.recordAttempt);
  const markSolutionViewed = useProgress((s) => s.markSolutionViewed);
  const failed = useProgress((s) => s.tasks[ct.id]?.failedAttempts ?? 0);
  const solved = useProgress((s) => s.tasks[ct.id]?.status === 'solved');

  const { doc, expected } = useMemo(() => {
    const parsed = new DOMParser().parseFromString(task.html, 'text/html');
    return { doc: parsed, expected: prepareSnippet(parsed) };
  }, [task.html]);
  const source = useMemo(() => displaySource(task.html), [task.html]);

  const [values, setValues] = useState<Record<string, string>>({});
  const [active, setActive] = useState(task.challenges[0]?.id ?? '');
  const [results, setResults] = useState<Record<string, ChallengeResult> | null>(null);
  const [revealed, setRevealed] = useState(false);

  const liveCount = (id: string): number | null => {
    const run = runSelector(doc, task.syntax, values[id] ?? '');
    return run.ok ? run.elements.length : null;
  };
  const activeRun = runSelector(doc, task.syntax, values[active] ?? '');
  const preview = previewDocument(doc, activeRun.ok ? activeRun.elements : []);

  const correctCount = results ? task.challenges.filter((c) => results[c.id]?.status === 'correct').length : 0;
  const passed = results !== null && correctCount === task.challenges.length;
  const allFilled = task.challenges.every((c) => (values[c.id] ?? '').trim().length > 0);

  const check = (): void => {
    const next = Object.fromEntries(task.challenges.map((c) => [c.id, checkChallenge(doc, task.syntax, c, expected.get(c.id) ?? [], values[c.id] ?? '')]));
    setResults(next);
    recordAttempt(ct.id, task.challenges.every((c) => next[c.id]?.status === 'correct'));
  };

  const setValue = (id: string, value: string): void => {
    setValues((prev) => ({ ...prev, [id]: value }));
    setActive(id);
  };

  const reveal = (): void => {
    if (!solved && failed < REVEAL_AFTER_FAILS && !confirm('Try a couple of times before looking at the answers. Show them anyway?')) return;
    markSolutionViewed(ct.id);
    setRevealed(true);
  };

  const label = SYNTAX_LABEL[task.syntax];

  return (
    <div className="mx-auto max-w-5xl px-5 py-7 lg:px-8">
      {header}
      <Markdown>{task.statement}</Markdown>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-faint">HTML</div>
          <div className="max-h-96 overflow-auto rounded-xl [&_pre]:my-0">
            <Markdown>{'```html\n' + source + '\n```'}</Markdown>
          </div>
        </div>
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-faint">
            <span>Rendered page</span>
            <span className="normal-case tracking-normal text-muted">highlighted: matches of the active {label.name}</span>
          </div>
          <iframe title="Rendered HTML snippet" sandbox="" srcDoc={preview} className="h-96 w-full rounded-xl border border-line bg-white" />
        </div>
      </div>

      <ol className="mt-5 space-y-3">
        {task.challenges.map((c, i) => {
          const result = results?.[c.id];
          const tone = result ? RESULT_TONE[result.status] : 'border-line';
          const isActive = active === c.id;
          return (
            <li key={c.id} className={`card border p-4 ${tone} ${isActive ? 'ring-2 ring-accent/40' : ''}`}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-6 text-center text-sm font-semibold tabular-nums text-faint">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <Markdown compact className="[&_p]:my-0">
                    {c.prompt}
                  </Markdown>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      className="input min-w-0 flex-1 font-mono text-sm"
                      aria-label={`${label.name} for task ${i + 1}`}
                      placeholder={label.placeholder}
                      spellCheck={false}
                      autoCapitalize="off"
                      autoComplete="off"
                      value={values[c.id] ?? ''}
                      onFocus={() => setActive(c.id)}
                      onChange={(e) => setValue(c.id, e.target.value)}
                      disabled={passed}
                    />
                    <span className="chip">{matchesLabel(values[c.id] ?? '', liveCount(c.id))}</span>
                  </div>
                  {result && <p className="mt-2 text-sm">{result.message}</p>}
                  {revealed && (
                    <div className="mt-2 text-sm">
                      <span className="text-muted">Reference: </span>
                      <code className="font-mono text-ok">{c.model}</code>
                      {c.explain && (
                        <Markdown compact className="mt-1 text-muted [&_p]:my-0">
                          {c.explain}
                        </Markdown>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 space-y-3">
        {!passed && (
          <button className="btn btn-primary" onClick={check} disabled={!allFilled}>
            Check selectors
          </button>
        )}
        {results && (
          <Callout tone={passed ? 'ok' : 'bad'} title={passed ? 'All selectors are correct! 🎉' : `${correctCount} of ${task.challenges.length} selectors are correct`}>
            {passed
              ? 'Every selector matches exactly the target elements.'
              : 'Fix the red (or yellow) ones. Click into a field to see its matches highlighted in the rendered page.'}
          </Callout>
        )}
        {results && <NextActions passed={passed} onSimilar={onSimilar} next={next} />}
        {task.explanation && (failed > 0 || passed) && <ExplanationPanel text={task.explanation} />}
        <HintsPanel taskId={ct.id} hints={task.hints} />
        {!revealed && (
          <button className="btn btn-ghost btn-sm" onClick={reveal}>
            👀 Show reference selectors
          </button>
        )}
        {revealed && (
          <Collapsible title="ℹ️ About reference selectors">
            <p className="text-sm text-muted">There is usually more than one correct selector. Yours is right if it matches exactly the same elements.</p>
          </Collapsible>
        )}
      </div>
    </div>
  );
}
