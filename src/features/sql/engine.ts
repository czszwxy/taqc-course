import type { Database, SqlJsStatic } from 'sql.js';
import type { SqlChallenge } from '../../content/schema';

/**
 * Pure helpers for SQL tasks (sql.js = SQLite in WebAssembly). Used by the app and by the validator.
 * Every check runs on a FRESH database built from the task's setup scripts, so learners can't break anything.
 */

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
}

export type RunOutcome = { ok: true; result: QueryResult | null } | { ok: false; error: string };

export function openDatabase(SQL: SqlJsStatic, scripts: string[]): Database {
  const db = new SQL.Database();
  db.exec(scripts.join('\n'));
  return db;
}

/** Runs one or more statements and returns the LAST result set (null if the SQL produced none). */
export function runSql(db: Database, sql: string): RunOutcome {
  try {
    const sets = db.exec(sql);
    const last = sets.at(-1);
    return { ok: true, result: last ? { columns: last.columns, rows: last.values } : null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Runs SQL on a throw-away copy of the task database. */
export function runOnFreshDb(SQL: SqlJsStatic, scripts: string[], sql: string): RunOutcome {
  const db = openDatabase(SQL, scripts);
  try {
    return runSql(db, sql);
  } finally {
    db.close();
  }
}

const rowKey = (row: unknown[]): string => JSON.stringify(row);

function sameRows(a: unknown[][], b: unknown[][]): boolean {
  return a.length === b.length && a.every((row, i) => rowKey(row) === rowKey(b[i] ?? []));
}

function sortedKeys(rows: unknown[][]): string[] {
  return rows.map(rowKey).sort();
}

export interface Comparison {
  equal: boolean;
  message: string;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** sql.js returns no result set for a SELECT with 0 rows (and for INSERT/UPDATE/DELETE) — both mean "no rows". */
const NO_ROWS: QueryResult = { columns: [], rows: [] };

/** `who` names the query whose result is compared ("your query" or "the check query"). */
export function compareResults(actualSet: QueryResult | null, expectedSet: QueryResult | null, orderMatters: boolean, who = 'your query'): Comparison {
  const actual = actualSet ?? NO_ROWS;
  const expected = expectedSet ?? NO_ROWS;
  if (actual.rows.length !== expected.rows.length) {
    return { equal: false, message: `Expected ${plural(expected.rows.length, 'row')}, ${who} returns ${plural(actual.rows.length, 'row')}.` };
  }
  if (expected.rows.length === 0) return { equal: true, message: 'Correct: 0 rows.' };
  if (actual.columns.length !== expected.columns.length) {
    return {
      equal: false,
      message: `Expected ${plural(expected.columns.length, 'column')}, ${who} returns ${plural(actual.columns.length, 'column')}. Select only the needed columns, in the asked order.`,
    };
  }
  if (sameRows(actual.rows, expected.rows)) return { equal: true, message: `Correct: ${plural(expected.rows.length, 'row')}.` };
  const sameSet = sortedKeys(actual.rows).every((key, i) => key === sortedKeys(expected.rows)[i]);
  if (sameSet && !orderMatters) return { equal: true, message: `Correct: ${plural(expected.rows.length, 'row')}.` };
  if (sameSet) return { equal: false, message: 'The rows are right, but their order is not. Check ORDER BY (column and ASC / DESC).' };
  return { equal: false, message: 'The number of rows is right, but some values differ from the expected result.' };
}

export type SqlStatus = 'correct' | 'wrong' | 'invalid' | 'rule';

export interface SqlCheck {
  status: SqlStatus;
  message: string;
}

/**
 * SELECT challenge: compare the learner's result with the model's result.
 * Change challenge (has `verify`): run the learner's statement, then the verify query, and compare
 * with the same verify query after the model statement.
 */
export function checkSqlChallenge(SQL: SqlJsStatic, scripts: string[], challenge: SqlChallenge, query: string): SqlCheck {
  if (!query.trim()) return { status: 'invalid', message: 'Write a query first.' };
  const verify = challenge.verify;
  const learner = verify ? runChange(SQL, scripts, query, verify) : runOnFreshDb(SQL, scripts, query);
  if (!learner.ok) return { status: 'invalid', message: `SQL error: ${learner.error}` };
  const model = verify ? runChange(SQL, scripts, challenge.model, verify) : runOnFreshDb(SQL, scripts, challenge.model);
  if (!model.ok) return { status: 'invalid', message: `The reference query failed: ${model.error}` };

  const who = verify ? 'the check query' : 'your query';
  const comparison = compareResults(learner.result, model.result, Boolean(verify) || challenge.orderMatters, who);
  if (!comparison.equal) {
    return { status: 'wrong', message: verify ? `After your statement the data is not as expected. ${comparison.message}` : comparison.message };
  }
  /*
   * Task-defined rule pattern from content JSON, e.g. "join" (require):
   * matches "SELECT … JOIN orders …", rejects "SELECT … FROM orders WHERE …".
   * https://regex101.com/?regex=join&flags=i
   */
  const broken = challenge.rules.find((r) => (r.kind === 'require') !== new RegExp(r.pattern, r.flags ?? 'i').test(query));
  if (broken) return { status: 'rule', message: broken.message };
  return { status: 'correct', message: verify ? 'Correct: the data changed exactly as expected.' : comparison.message };
}

/** Runs a change statement and then the verify query on one fresh database. */
export function runChange(SQL: SqlJsStatic, scripts: string[], statement: string, verify: string): RunOutcome {
  const db = openDatabase(SQL, scripts);
  try {
    const changed = runSql(db, statement);
    return changed.ok ? runSql(db, verify) : changed;
  } finally {
    db.close();
  }
}

export interface PreviewRun {
  outcome: RunOutcome;
  /** Rows changed by the last INSERT / UPDATE / DELETE (0 for SELECT). */
  changed: number;
  /** Result of the challenge's verify query after the learner's statement (change challenges only). */
  verify: RunOutcome | null;
}

/** "Run" button: executes the learner's SQL on a fresh copy and, for change challenges, the verify query after it. */
export function runPreview(SQL: SqlJsStatic, scripts: string[], sql: string, verify: string | undefined): PreviewRun {
  const db = openDatabase(SQL, scripts);
  try {
    const outcome = runSql(db, sql);
    const changed = db.getRowsModified();
    const verifyRun = verify && outcome.ok ? runSql(db, verify) : null;
    return { outcome, changed, verify: verifyRun };
  } finally {
    db.close();
  }
}

export interface TableInfo {
  name: string;
  columns: { name: string; type: string; pk: boolean }[];
  rowCount: number;
}

/** Tables, columns and row counts for the schema explorer. */
export function describeDatabase(db: Database): TableInfo[] {
  const names = (db.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")[0]?.values ?? []).map(
    (row) => String(row[0]),
  );
  return names.map((name) => {
    const info = db.exec(`SELECT name, type, pk FROM pragma_table_info('${name}')`)[0]?.values ?? [];
    const count = db.exec(`SELECT COUNT(*) FROM "${name}"`)[0]?.values[0]?.[0];
    return {
      name,
      columns: info.map(([colName, type, pk]) => ({ name: String(colName), type: String(type), pk: Number(pk) > 0 })),
      rowCount: Number(count ?? 0),
    };
  });
}
