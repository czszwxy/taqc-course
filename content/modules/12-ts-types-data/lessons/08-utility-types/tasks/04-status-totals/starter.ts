export type Status = 'passed' | 'failed' | 'skipped';

export function emptyTotals(): Record<Status, number> {
  // твій код тут
}

export function totals(statuses: Status[]): Record<Status, number> {
  // твій код тут
}

// твій код тут: export type Totals = …
