export type Status = 'passed' | 'failed' | 'skipped' | 'flaky';

export interface TestResult {
  title: string;
  status: Status;
  durationMs: number;
}

export function countByStatus(results: TestResult[]): Record<Status, number> {
  // твій код тут
}
