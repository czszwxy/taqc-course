import { useState } from 'react';
import type { TableTask } from '../../content/schema';
import { useProgress } from '../progress/store';
import { Markdown } from '../../components/Markdown';
import { Callout } from '../../components/ui';
import { ExplanationPanel, HintsPanel, NextActions, PlaygroundLink } from './shared';
import type { TaskViewProps } from './types';

/** Correct answers can be revealed after this many failed checks (or earlier with a confirmation). */
const REVEAL_AFTER_FAILS = 2;
/** Given cells up to this length (IDs like "TC-01", "Yes") never wrap. */
const SHORT_CELL_LENGTH = 12;

type Answers = Record<number, Record<string, string>>;

function cellTone(checked: boolean, value: string | undefined, correct: string): string {
  if (!checked) return 'border-line';
  return value === correct ? 'border-ok/70 bg-ok-soft' : 'border-bad/70 bg-bad-soft';
}

interface AnswerSelectProps {
  label: string;
  options: string[];
  value: string | undefined;
  correct: string;
  checked: boolean;
  locked: boolean;
  revealed: boolean;
  onChange: (value: string) => void;
}

/** One answer cell: the select, coloured after a check, plus the correct answer once revealed. */
function AnswerSelect({ label, options, value, correct, checked, locked, revealed, onChange }: AnswerSelectProps) {
  return (
    <>
      <select
        className={`select py-1.5 ${cellTone(checked, value, correct)}`}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={locked}
        aria-label={label}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {revealed && value !== correct && <div className="mt-1 text-xs font-semibold text-ok">→ {correct}</div>}
    </>
  );
}

export function TableTaskView({ ct, header, onSimilar, next }: TaskViewProps) {
  const task = ct.task as TableTask;
  const recordAttempt = useProgress((s) => s.recordAttempt);
  const markSolutionViewed = useProgress((s) => s.markSolutionViewed);
  const failed = useProgress((s) => s.tasks[ct.id]?.failedAttempts ?? 0);
  const solved = useProgress((s) => s.tasks[ct.id]?.status === 'solved');
  const [answers, setAnswers] = useState<Answers>({});
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const totalCells = task.rows.length * task.answerColumns.length;
  const isRowCorrect = (rowIndex: number): boolean =>
    task.answerColumns.every((col) => answers[rowIndex]?.[col.id] === task.rows[rowIndex].answers[col.id]);
  const correctCells = task.rows
    .flatMap((row, r) => task.answerColumns.map((col) => answers[r]?.[col.id] === row.answers[col.id]))
    .filter(Boolean).length;
  const allFilled = task.rows.every((_, r) => task.answerColumns.every((col) => answers[r]?.[col.id]));
  const passed = correctCells === totalCells;
  const wrongRows = task.rows.map((row, r) => ({ row, r })).filter(({ r }) => !isRowCorrect(r));

  const setCell = (rowIndex: number, colId: string, value: string): void => {
    setAnswers((prev) => ({ ...prev, [rowIndex]: { ...prev[rowIndex], [colId]: value } }));
    setChecked(false);
  };

  const check = (): void => {
    setChecked(true);
    recordAttempt(ct.id, passed);
  };

  const reveal = (): void => {
    if (!solved && failed < REVEAL_AFTER_FAILS && !confirm('Try a couple of times before looking at the answers. Show them anyway?')) return;
    markSolutionViewed(ct.id);
    setRevealed(true);
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-7 lg:px-8">
      {header}
      <Markdown>{task.statement}</Markdown>
      <PlaygroundLink id={task.playground} />

      {/* Phones: one card per row — given values with their column names, then the answer selects. */}
      <ol className="mt-5 space-y-3 md:hidden">
        {task.rows.map((row, r) => (
          <li key={r} className="card p-4 text-sm">
            <div className="mb-2 text-xs font-semibold tabular-nums text-faint">#{r + 1}</div>
            <dl className="space-y-1.5">
              {row.given.map((g, i) => (
                <div key={i}>
                  <dt className="text-xs font-semibold text-muted">{task.givenColumns[i]}</dt>
                  <dd>
                    <Markdown compact className="[&_p]:my-0">
                      {g}
                    </Markdown>
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 space-y-2 border-t border-line pt-3">
              {task.answerColumns.map((col) => (
                <label key={col.id} className="block">
                  <span className="mb-1 block text-xs font-semibold text-accent-fg">{col.label}</span>
                  <AnswerSelect
                    label={`${col.label}, row ${r + 1}`}
                    options={col.options}
                    value={answers[r]?.[col.id]}
                    correct={row.answers[col.id] ?? ''}
                    checked={checked}
                    locked={checked && passed}
                    revealed={revealed}
                    onChange={(value) => setCell(r, col.id, value)}
                  />
                </label>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <div className="card mt-5 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead>
            <tr className="bg-hover text-left">
              <th className="border-b border-line px-3 py-2 font-semibold text-faint">#</th>
              {task.givenColumns.map((c) => (
                <th key={c} className="border-b border-line px-3 py-2 font-semibold">
                  {c}
                </th>
              ))}
              {task.answerColumns.map((c) => (
                <th key={c.id} className="border-b border-l-2 border-line border-l-accent/60 px-3 py-2 font-semibold text-accent-fg">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {task.rows.map((row, r) => (
              <tr key={r} className="border-b border-line last:border-b-0">
                <td className="px-3 py-2 align-top tabular-nums text-faint">{r + 1}</td>
                {row.given.map((g, i) => (
                  <td key={i} className={`max-w-[18rem] px-3 py-2 align-top ${g.length <= SHORT_CELL_LENGTH ? 'whitespace-nowrap' : ''}`}>
                    <Markdown compact className="[&_p]:my-0">
                      {g}
                    </Markdown>
                  </td>
                ))}
                {task.answerColumns.map((col) => (
                  <td key={col.id} className="min-w-[9.5rem] border-l-2 border-l-accent/30 px-2 py-1.5 align-top">
                    <AnswerSelect
                      label={`${col.label}, row ${r + 1}`}
                      options={col.options}
                      value={answers[r]?.[col.id]}
                      correct={row.answers[col.id] ?? ''}
                      checked={checked}
                      locked={checked && passed}
                      revealed={revealed}
                      onChange={(value) => setCell(r, col.id, value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 space-y-3">
        {!(checked && passed) && (
          <button className="btn btn-primary" onClick={check} disabled={!allFilled}>
            Check table
          </button>
        )}
        {checked && (
          <Callout tone={passed ? 'ok' : 'bad'} title={passed ? 'All cells are correct! 🎉' : `${correctCells} of ${totalCells} cells are correct`}>
            {passed ? 'The table is complete and correct.' : 'Red cells are wrong. Read the notes for those rows, fix and check again.'}
          </Callout>
        )}
        {checked && !passed && wrongRows.some(({ row }) => row.explain) && (
          <div className="card space-y-2 p-4 text-sm">
            {wrongRows
              .filter(({ row }) => row.explain)
              .map(({ row, r }) => (
                <div key={r} className="flex gap-2">
                  <span className="font-semibold tabular-nums text-bad">#{r + 1}</span>
                  <Markdown compact className="min-w-0 flex-1 [&_p]:my-0">
                    {row.explain ?? ''}
                  </Markdown>
                </div>
              ))}
          </div>
        )}
        {checked && <NextActions passed={passed} onSimilar={onSimilar} next={next} />}
        {task.explanation && (failed > 0 || (checked && passed)) && <ExplanationPanel text={task.explanation} />}
        <HintsPanel taskId={ct.id} hints={task.hints} />
        {!revealed && !(checked && passed) && (
          <button className="btn btn-ghost btn-sm" onClick={reveal}>
            👀 Show correct answers
          </button>
        )}
      </div>
    </div>
  );
}
