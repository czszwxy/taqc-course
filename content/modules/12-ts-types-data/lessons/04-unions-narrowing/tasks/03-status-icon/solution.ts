export type TestStatus = 'passed' | 'failed' | 'skipped';

const ICONS: Record<TestStatus, string> = { passed: '✅', failed: '❌', skipped: '⏭' };

export function statusIcon(status: TestStatus): string {
  return ICONS[status];
}
