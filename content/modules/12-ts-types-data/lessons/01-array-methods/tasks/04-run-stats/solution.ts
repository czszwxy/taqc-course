export type TestRun = { title: string; status: 'passed' | 'failed' | 'skipped'; durationMs: number };

export function totalDuration(runs: TestRun[]): number {
  return runs.reduce((sum, r) => sum + r.durationMs, 0);
}

export function hasFailures(runs: TestRun[]): boolean {
  return runs.some((r) => r.status === 'failed');
}

export function slowest(runs: TestRun[], count: number): string[] {
  return [...runs]
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, count)
    .map((r) => r.title);
}
