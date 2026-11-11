import { useState } from 'react';
import type { TableTask } from '../../content/schema';
import { useProgress } from '../progress/store';
import { Markdown } from '../../components/Markdown';
import { Callout } from '../../components/ui';
import { ExplanationPanel, HintsPanel, NextActions } from './shared';
import type { TaskViewProps } from './types';

/** Correct answers can be revealed after this many failed checks (or earlier with a confirmation). */
const REVEAL_AFTER_FAILS = 2;

type Answers = Record<number, Record<string, string>>;

function cellTone(checked: boolean, value: string | undefined, correct: string): string {
  if (!checked) return 'border-line';
  return value === correct ? 'border-ok/70 bg-ok-soft' : 'border-bad/70 bg-bad-soft';
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
    <div className="mx-auto max-w-4xl px-5 py-7 lg:px-8">
      {header}
      <Markdown>{task.statement}</Markdown>

      <div className="card mt-5 overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-sm">
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
                <td className="px-3 py-2 tabular-nums text-faint">{r + 1}</td>
                {row.given.map((g, i) => (
                  <td key={i} className="px-3 py-2">
                    <Markdown compact className="[&_p]:my-0">
                      {g}
                    </Markdown>
                  </td>
                ))}
                {task.answerColumns.map((col) => {
                  const value = answers[r]?.[col.id];
                  return (
                    <td key={col.id} className="border-l-2 border-l-accent/30 px-2 py-1.5">
                      <select
                        className={`select py-1.5 ${cellTone(checked, value, row.answers[col.id])}`}
                        value={value ?? ''}
                        onChange={(e) => setCell(r, col.id, e.target.value)}
                        disabled={checked && passed}
                        aria-label={`${col.label}, row ${r + 1}`}
                      >
                        <option value="">—</option>
                        {col.options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                      {revealed && value !== row.answers[col.id] && <div className="mt-1 text-xs font-semibold text-ok">→ {row.answers[col.id]}</div>}
                    </td>
                  );
                })}
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
