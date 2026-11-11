export const PERCENT = 100;

export class TestCounter {
  passed = 0;
  failed = 0;

  record(status: 'passed' | 'failed'): void {
    if (status === 'passed') this.passed++;
    else this.failed++;
  }

  total(): number {
    return this.passed + this.failed;
  }

  passRate(): number {
    if (this.total() === 0) return 0;
    return Math.round((this.passed / this.total()) * PERCENT);
  }
}
