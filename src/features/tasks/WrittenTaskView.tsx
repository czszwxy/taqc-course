import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { WrittenField, WrittenTask } from '../../content/schema';
import { useProgress } from '../progress/store';
import { Markdown } from '../../components/Markdown';
import { Callout } from '../../components/ui';
import { evaluateRules, type FormValues } from './forms';
import { Field, ModelView, StepsEditor, TextArea, TextInput } from './FormFields';
import { Collapsible, CopyForReview, ExplanationPanel, FailureList, HintsPanel, NextActions, SelfReviewChecklist } from './shared';
import { PLAYGROUND_PAGES } from '../../playground/registry';
import type { TaskViewProps } from './types';

/** The model answer can be opened after this many failed checks (or earlier with a confirmation). */
const REVEAL_AFTER_FAILS = 2;
const DRAFT_SAVE_DELAY_MS = 400;
const TEXTAREA_ROWS = 5;

function emptyValues(fields: WrittenField[]): FormValues {
  return Object.fromEntries(fields.map((f) => [f.id, f.kind === 'list' ? [''] : '']));
}

function isFilled(value: string | string[] | undefined): boolean {
  if (Array.isArray(value)) return value.some((v) => v.trim() !== '');
  return (value ?? '').trim() !== '';
}

function asText(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.filter((v) => v.trim()).map((v, i) => `${i + 1}. ${v}`).join('\n');
  return value ?? '';
}

function FieldInput({ field, value, onChange, disabled }: { field: WrittenField; value: string | string[]; onChange: (v: string | string[]) => void; disabled: boolean }) {
  if (field.kind === 'list') {
    return <StepsEditor steps={Array.isArray(value) ? value : [value]} onChange={onChange} disabled={disabled} placeholder={field.placeholder} />;
  }
  const text = Array.isArray(value) ? value.join('\n') : value;
  if (field.kind === 'text') {
    return <TextInput value={text} onChange={onChange} disabled={disabled} placeholder={field.placeholder} />;
  }
  return <TextArea value={text} onChange={onChange} disabled={disabled} placeholder={field.placeholder} rows={TEXTAREA_ROWS} />;
}

export function WrittenTaskView({ ct, header, onSimilar, next }: TaskViewProps) {
  const task = ct.task as WrittenTask;
  const saveDraft = useProgress((s) => s.saveDraft);
  const recordAttempt = useProgress((s) => s.recordAttempt);
  const markSolutionViewed = useProgress((s) => s.markSolutionViewed);
  const failed = useProgress((s) => s.tasks[ct.id]?.failedAttempts ?? 0);
  const solved = useProgress((s) => s.tasks[ct.id]?.status === 'solved');
  const [values, setValues] = useState<FormValues>(() => {
    const draft = useProgress.getState().drafts[ct.id] as FormValues | undefined;
    return { ...emptyValues(task.fields), ...draft };
  });
  const [result, setResult] = useState<{ passed: boolean; failures: string[] } | null>(null);
  const [showModel, setShowModel] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => saveDraft(ct.id, values), DRAFT_SAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [values, ct.id, saveDraft]);

  const setField = (id: string, v: string | string[]): void => {
    setValues((prev) => ({ ...prev, [id]: v }));
    if (result && !result.passed) setResult(null);
  };

  const submit = (): void => {
    const missing = task.fields.filter((f) => !isFilled(values[f.id])).map((f) => `Fill in “${f.label}”.`);
    const failures = [...missing, ...evaluateRules(task.rules, values)];
    const passed = failures.length === 0;
    setResult({ passed, failures });
    recordAttempt(ct.id, passed);
    if (passed) setShowModel(true);
  };

  const revealModel = (): void => {
    if (!solved && failed < REVEAL_AFTER_FAILS && !confirm('Try at least twice before looking at the model answer. Show it anyway?')) return;
    markSolutionViewed(ct.id);
    setShowModel(true);
  };

  const modelRows: [string, string | string[]][] = task.fields.map((f) => [f.label, task.model[f.id] ?? '']);
  const reviewBundle = (): string =>
    [
      `## Task: ${task.title}`,
      task.statement,
      '## My answer',
      ...task.fields.map((f) => `**${f.label}:**\n${asText(values[f.id])}`),
      '## Model answer',
      ...task.fields.map((f) => `**${f.label}:**\n${asText(task.model[f.id])}`),
      '## Review criteria',
      ...task.checklist.map((c) => `- ${c}`),
      '',
      'Please review my answer against the criteria and the model answer. What is good, what is missing, and how would an experienced QA engineer improve it?',
    ].join('\n\n');

  const playground = task.playground ? PLAYGROUND_PAGES.find((p) => p.id === task.playground) : undefined;
  const locked = Boolean(result?.passed);

  return (
    <div className="mx-auto max-w-3xl px-5 py-7 lg:px-8">
      {header}
      <Markdown>{task.statement}</Markdown>
      {playground && (
        <Link to={playground.path} target="_blank" className="btn btn-secondary mt-3">
          🐞 Open “{playground.title}” in a new tab ↗
        </Link>
      )}

      <div className="card mt-6 space-y-4 p-5">
        {task.fields.map((f) => (
          <Field key={f.id} label={f.label} hint={f.hint} required>
            <FieldInput field={f} value={values[f.id] ?? ''} onChange={(v) => setField(f.id, v)} disabled={locked} />
          </Field>
        ))}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {!locked && (
            <button className="btn btn-primary" onClick={submit}>
              Check my answer
            </button>
          )}
          <CopyForReview build={reviewBundle} />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {result && !result.passed && <FailureList title="Your answer needs some work:" items={result.failures} />}
        {result?.passed && (
          <Callout tone="ok" title="All checks passed 🎉">
            Automatic checks cover structure and key points. Now compare with the model answer and go through the self-review checklist.
          </Callout>
        )}
        {result && <NextActions passed={result.passed} onSimilar={onSimilar} next={next} />}
        {task.explanation && (failed > 0 || solved) && <ExplanationPanel text={task.explanation} defaultOpen={result !== null && !result.passed} />}
        <HintsPanel taskId={ct.id} hints={task.hints} />
        {showModel ? (
          <>
            <Collapsible title="📗 Model answer" defaultOpen>
              <ModelView rows={modelRows} />
            </Collapsible>
            <SelfReviewChecklist items={task.checklist} />
          </>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={revealModel}>
            👀 Show model answer
          </button>
        )}
      </div>
    </div>
  );
}
