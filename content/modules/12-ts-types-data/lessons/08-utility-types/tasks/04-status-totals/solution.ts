export type Status = 'passed' | 'failed' | 'skipped';

export function emptyTotals(): Record<Status, number> {
  return { passed: 0, failed: 0, skipped: 0 };
}

export function totals(statuses: Status[]): Record<Status, number> {
  const result = emptyTotals();
  for (const s of statuses) {
    result[s] += 1;
  }
  return result;
}

export type Totals = ReturnType<typeof totals>;
