export type TestRun = { title: string; status: 'passed' | 'failed' | 'skipped'; durationMs: number };

export function failedTitles(runs: TestRun[]): string[] {
  // твій код тут
}

export function findTest(runs: TestRun[], title: string): TestRun | undefined {
  // твій код тут
}
