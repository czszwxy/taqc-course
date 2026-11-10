import { useMemo, useState } from 'react';
import type { ValueSetTask } from '../../content/schema';
import { useProgress } from '../progress/store';
import { Markdown } from '../../components/Markdown';
import { Callout } from '../../components/ui';
import { GENERATORS, parseNumberList } from './generators';
import { ExplanationPanel, FailureList, HintsPanel, NextActions } from './shared';
import type { TaskViewProps } from './types';

export function ValueSetTaskView({ ct, seed, header, onSimilar, next }: TaskViewProps) {
  const task = ct.task as ValueSetTask;
  const recordAttempt = useProgress((s) => s.recordAttempt);
  const failed = useProgress((s) => s.tasks[ct.id]?.failedAttempts ?? 0);
  const generator = GENERATORS[task.generator.name];
  const problem = useMemo(() => generator?.(task.generator.params, seed), [generator, task.generator.params, seed]);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ passed: boolean; messages: string[] } | null>(null);

  if (!problem) return <div className="p-8 text-bad">Unknown generator "{task.generator.name}"</div>;
  const parsed = parseNumberList(input);

  const check = () => {
    const messages = parsed.invalid.length ? [`Не числа: ${parsed.invalid.map((t) => `\`${t}\``).join(', ')}`] : problem.feedback(parsed.values);
    const passed = messages.length === 0;
    setResult({ passed, messages });
    recordAttempt(ct.id, passed);
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-7 lg:px-8">
      {header}
      {seed > 0 && <div className="chip chip-accent mb-3">Similar task #{seed}</div>}
      <Markdown>{problem.statement}</Markdown>

      <div className="card mt-5 p-5">
        <label className="label" htmlFor="values">
          Values to test
        </label>
        <input
          id="values"
          className="input font-mono"
          placeholder="e.g. 1, 2, 3"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setResult(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && parsed.values.length > 0 && check()}
          disabled={result?.passed}
        />
        <div className="mt-3 flex min-h-7 flex-wrap gap-1.5">
          {[...parsed.values]
            .sort((a, b) => a - b)
            .map((v) => (
              <span key={v} className="chip chip-accent font-mono">
                {v}
              </span>
            ))}
          {parsed.invalid.map((t) => (
            <span key={t} className="chip chip-bad font-mono">
              {t}
            </span>
          ))}
        </div>
        {!result?.passed && (
          <button className="btn btn-primary mt-3" disabled={parsed.values.length === 0} onClick={check}>
            Check
          </button>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {result && !result.passed && <FailureList title="Not quite — here is what's off:" items={result.messages} />}
        {result?.passed && (
          <Callout tone="ok" title="Correct! 🎉">
            <Markdown compact>{problem.answerNote}</Markdown>
          </Callout>
        )}
        {result && <NextActions passed={result.passed} onSimilar={onSimilar} next={next} onRetry={() => setResult(null)} />}
        {task.explanation && (failed > 0 || result?.passed) && <ExplanationPanel text={task.explanation} defaultOpen={!result?.passed} />}
        <HintsPanel taskId={ct.id} hints={task.hints} />
      </div>
    </div>
  );
}
