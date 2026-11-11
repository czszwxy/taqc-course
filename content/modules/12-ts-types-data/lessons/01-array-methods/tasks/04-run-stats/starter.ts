export type TestRun = { title: string; status: 'passed' | 'failed' | 'skipped'; durationMs: number };

export function totalDuration(runs: TestRun[]): number {
  // твій код тут
}

export function hasFailures(runs: TestRun[]): boolean {
  // твій код тут
}

export function slowest(runs: TestRun[], count: number): string[] {
  // твій код тут
}
