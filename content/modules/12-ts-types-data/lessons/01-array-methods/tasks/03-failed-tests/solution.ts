export type TestRun = { title: string; status: 'passed' | 'failed' | 'skipped'; durationMs: number };

export function failedTitles(runs: TestRun[]): string[] {
  return runs.filter((r) => r.status === 'failed').map((r) => r.title);
}

export function findTest(runs: TestRun[], title: string): TestRun | undefined {
  return runs.find((r) => r.title === title);
}
