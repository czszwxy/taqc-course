export type Status = 'passed' | 'failed' | 'skipped' | 'flaky';

export interface TestResult {
  title: string;
  status: Status;
  durationMs: number;
}

export function countByStatus(results: TestResult[]): Record<Status, number> {
  const counts: Record<Status, number> = { passed: 0, failed: 0, skipped: 0, flaky: 0 };
  for (const result of results) {
    counts[result.status] += 1;
  }
  return counts;
}
