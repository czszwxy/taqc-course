import { useEffect, useMemo, useState } from 'react';
import type { SqlJsStatic } from 'sql.js';
import type { SqlChallenge, SqlTask } from '../../content/schema';
import { DATABASE_SCRIPTS } from '../../content/loader';
import { useProgress } from '../progress/store';
import { Markdown } from '../../components/Markdown';
import { Callout } from '../../components/ui';
import { Collapsible, ExplanationPanel, HintsPanel, NextActions } from '../tasks/shared';
import type { TaskViewProps } from '../tasks/types';
import { checkSqlChallenge, describeDatabase, openDatabase, runOnFreshDb, runPreview, type PreviewRun, type QueryResult, type RunOutcome, type SqlCheck, type TableInfo } from './engine';
import { loadSqlJs } from './load';

/** Reference queries can be revealed after this many failed checks (or earlier with a confirmation). */
const REVEAL_AFTER_FAILS = 2;
/** Result tables show at most this many rows (the check itself always uses all rows). */
const MAX_SHOWN_ROWS = 100;
/** "Preview rows" in the schema explorer. */
const PREVIEW_ROWS = 20;
const DRAFT_SAVE_DELAY_MS = 400;

const RESULT_TONE: Record<SqlCheck['status'], string> = {
  correct: 'border-ok/60 bg-ok-soft',
  wrong: 'border-bad/60 bg-bad-soft',
  invalid: 'border-bad/60 bg-bad-soft',
  rule: 'border-warn/60 bg-warn-soft',
};

type Drafts = Record<string, string>;

function databaseNames(task: SqlTask): string[] {
  return Array.isArray(task.database) ? task.database : [task.database];
}

function rowsLabel(n: number): string {
  return `${n} ${n === 1 ? 'row' : 'rows'}`;
}

function Cell({ value }: { value: unknown }) {
  if (value === null) return <span className="italic text-faint">NULL</span>;
  return <>{String(value)}</>;
}

function ResultTable({ result }: { result: QueryResult | null }) {
  if (!result || result.rows.length === 0) return <p className="mt-2 text-sm text-muted">No rows returned (0 rows).</p>;
  const shown = result.rows.slice(0, MAX_SHOWN_ROWS);
  const hidden = result.rows.length - shown.length;
  return (
    <div className="mt-2 max-h-80 overflow-auto rounded-lg border border-line">
      <table className="w-full border-collapse font-mono text-xs">
        <thead className="sticky top-0 bg-sunken">
          <tr>
            {result.columns.map((col, i) => (
              <th key={i} className="whitespace-nowrap border-b border-line px-2.5 py-1.5 text-left font-semibold">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((row, r) => (
            <tr key={r} className="odd:bg-surface even:bg-canvas">
              {row.map((value, c) => (
                <td key={c} className="whitespace-nowrap border-b border-line/60 px-2.5 py-1">
                  <Cell value={value} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-line bg-sunken px-2.5 py-1 text-xs text-muted">
        {rowsLabel(result.rows.length)}
        {hidden > 0 && ` — showing the first ${MAX_SHOWN_ROWS}`}
      </div>
    </div>
  );
}

function OutcomeView({ outcome }: { outcome: RunOutcome }) {
  if (!outcome.ok) return <p className="mt-2 rounded-lg bg-bad-soft px-3 py-2 font-mono text-xs text-bad">SQL error: {outcome.error}</p>;
  return <ResultTable result={outcome.result} />;
}

function PreviewView({ run, challenge }: { run: PreviewRun; challenge: SqlChallenge }) {
  if (!run.outcome.ok || !challenge.verify) return <OutcomeView outcome={run.outcome} />;
  return (
    <div className="mt-2 text-sm">
      <p className="text-muted">
        Statement executed on a copy of the database. Rows changed: <b className="text-fg">{run.changed}</b>. The check query then shows:
      </p>
      <pre className="mt-1 overflow-auto rounded-lg bg-sunken px-3 py-2 font-mono text-xs">{challenge.verify}</pre>
      {run.verify && <OutcomeView outcome={run.verify} />}
    </div>
  );
}

function SchemaExplorer({ SQL, scripts, tables }: { SQL: SqlJsStatic; scripts: string[]; tables: TableInfo[] }) {
  const [previewTable, setPreviewTable] = useState<string | null>(null);
  const preview = useMemo(
    () => (previewTable ? runOnFreshDb(SQL, scripts, `SELECT * FROM "${previewTable}" LIMIT ${PREVIEW_ROWS}`) : null),
    [SQL, scripts, previewTable],
  );
  return (
    <Collapsible title={`🗄️ Database: ${tables.length} tables (click to see columns and rows)`}>
      <div className="grid gap-3 sm:grid-cols-2">
        {tables.map((t) => (
          <div key={t.name} className="rounded-lg border border-line p-3">
            <div className="flex items-center justify-between gap-2">
              <code className="font-mono text-sm font-semibold">{t.name}</code>
              <span className="text-xs text-muted">{rowsLabel(t.rowCount)}</span>
            </div>
            <ul className="mt-1.5 space-y-0.5 font-mono text-xs">
              {t.columns.map((c) => (
                <li key={c.name}>
                  {c.name} <span className="text-faint">{c.type}</span>
                  {c.pk && <span className="ml-1 rounded bg-accent-soft px-1 text-accent">PK</span>}
                </li>
              ))}
            </ul>
            <button className="btn btn-ghost btn-sm mt-2" onClick={() => setPreviewTable(previewTable === t.name ? null : t.name)}>
              {previewTable === t.name ? 'Hide rows' : 'Preview rows'}
            </button>
          </div>
        ))}
      </div>
      {preview && previewTable && (
        <div className="mt-3">
          <div className="text-xs text-muted">
            <code>SELECT * FROM {previewTable} LIMIT {PREVIEW_ROWS}</code>
          </div>
          <OutcomeView outcome={preview} />
        </div>
      )}
    </Collapsible>
  );
}

function useSqlJs(): { SQL: SqlJsStatic | null; error: string | null } {
  const [SQL, setSQL] = useState<SqlJsStatic | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async (): Promise<void> => {
      try {
        const loaded = await loadSqlJs();
        if (alive) setSQL(loaded);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, []);
  return { SQL, error };
}

export default function SqlTaskView({ ct, header, onSimilar, next }: TaskViewProps) {
  const task = ct.task as SqlTask;
  const recordAttempt = useProgress((s) => s.recordAttempt);
  const markSolutionViewed = useProgress((s) => s.markSolutionViewed);
  const saveDraft = useProgress((s) => s.saveDraft);
  const failed = useProgress((s) => s.tasks[ct.id]?.failedAttempts ?? 0);
  const solved = useProgress((s) => s.tasks[ct.id]?.status === 'solved');
  const { SQL, error: loadError } = useSqlJs();

  const scripts = useMemo(() => databaseNames(task).map((name) => DATABASE_SCRIPTS[name] ?? ''), [task]);
  const tables = useMemo(() => {
    if (!SQL) return [];
    const db = openDatabase(SQL, scripts);
    try {
      return describeDatabase(db);
    } finally {
      db.close();
    }
  }, [SQL, scripts]);

  const [values, setValues] = useState<Drafts>(() => (useProgress.getState().drafts[ct.id] as Drafts | undefined) ?? {});
  const [runs, setRuns] = useState<Record<string, PreviewRun>>({});
  const [results, setResults] = useState<Record<string, SqlCheck> | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => saveDraft(ct.id, values), DRAFT_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [values, ct.id, saveDraft]);

  const correctCount = results ? task.challenges.filter((c) => results[c.id]?.status === 'correct').length : 0;
  const passed = results !== null && correctCount === task.challenges.length;
  const allFilled = task.challenges.every((c) => (values[c.id] ?? '').trim().length > 0);

  const run = (c: SqlChallenge): void => {
    if (!SQL || !(values[c.id] ?? '').trim()) return;
    setRuns((prev) => ({ ...prev, [c.id]: runPreview(SQL, scripts, values[c.id] ?? '', c.verify) }));
  };

  const check = (): void => {
    if (!SQL) return;
    const checked = Object.fromEntries(task.challenges.map((c) => [c.id, checkSqlChallenge(SQL, scripts, c, values[c.id] ?? '')]));
    setResults(checked);
    recordAttempt(
      ct.id,
      task.challenges.every((c) => checked[c.id]?.status === 'correct'),
    );
  };

  const reveal = (): void => {
    if (!solved && failed < REVEAL_AFTER_FAILS && !confirm('Try a couple of times before looking at the answers. Show them anyway?')) return;
    markSolutionViewed(ct.id);
    setRevealed(true);
  };

  if (loadError) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-7 lg:px-8">
        {header}
        <Callout tone="bad" title="Could not start the SQL engine">
          {loadError}
        </Callout>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-7 lg:px-8">
      {header}
      <Markdown>{task.statement}</Markdown>

      <div className="mt-5">
        {SQL ? <SchemaExplorer SQL={SQL} scripts={scripts} tables={tables} /> : <p className="text-sm text-muted">Loading the SQL engine…</p>}
      </div>

      <ol className="mt-5 space-y-3">
        {task.challenges.map((c, i) => {
          const result = results?.[c.id];
          const tone = result ? RESULT_TONE[result.status] : 'border-line';
          const preview = runs[c.id];
          return (
            <li key={c.id} className={`card border p-4 ${tone}`}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-6 text-center text-sm font-semibold tabular-nums text-faint">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <Markdown compact className="[&_p]:my-0">
                    {c.prompt}
                  </Markdown>
                  <textarea
                    className="input mt-2 min-h-24 w-full resize-y font-mono text-sm"
                    aria-label={`SQL for task ${i + 1}`}
                    placeholder={c.verify ? 'INSERT … / UPDATE … / DELETE …' : 'SELECT …'}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoComplete="off"
                    value={values[c.id] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        run(c);
                      }
                    }}
                    disabled={passed}
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button className="btn btn-secondary btn-sm" onClick={() => run(c)} disabled={!SQL || !(values[c.id] ?? '').trim()}>
                      ▶ Run
                    </button>
                    <span className="text-xs text-faint">Ctrl+Enter · every run starts from the original data</span>
                  </div>
                  {preview && <PreviewView run={preview} challenge={c} />}
                  {result && <p className="mt-2 text-sm font-medium">{result.message}</p>}
                  {revealed && (
                    <div className="mt-2 text-sm">
                      <span className="text-muted">Reference:</span>
                      <pre className="mt-1 overflow-auto rounded-lg bg-sunken px-3 py-2 font-mono text-xs text-ok">{c.model}</pre>
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
          <button className="btn btn-primary" onClick={check} disabled={!allFilled || !SQL}>
            Check queries
          </button>
        )}
        {results && (
          <Callout tone={passed ? 'ok' : 'bad'} title={passed ? 'All queries are correct! 🎉' : `${correctCount} of ${task.challenges.length} queries are correct`}>
            {passed
              ? 'Every query returns exactly the expected data.'
              : 'Fix the red (or yellow) ones. Use ▶ Run to see what your query actually returns and compare it with the task.'}
          </Callout>
        )}
        {results && <NextActions passed={passed} onSimilar={onSimilar} next={next} />}
        {task.explanation && (failed > 0 || passed) && <ExplanationPanel text={task.explanation} />}
        <HintsPanel taskId={ct.id} hints={task.hints} />
        {!revealed && (
          <button className="btn btn-ghost btn-sm" onClick={reveal}>
            👀 Show reference queries
          </button>
        )}
        {revealed && (
          <Collapsible title="ℹ️ About reference queries">
            <p className="text-sm text-muted">
              A query can be written in many ways. Yours is right if it returns the same rows (or changes the data the same way).
            </p>
          </Collapsible>
        )}
      </div>
    </div>
  );
}
