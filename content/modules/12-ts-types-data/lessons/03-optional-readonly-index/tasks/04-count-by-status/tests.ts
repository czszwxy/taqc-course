import { countByStatus } from './solution';

describe('countByStatus', () => {
  it('counts every status', () => {
    expect(countByStatus(['passed', 'failed', 'passed', 'skipped'])).toEqual({ passed: 2, failed: 1, skipped: 1 });
  }, 'Перше значення для ключа — undefined. Використай (counts[s] ?? 0) + 1.');
  it('works with unknown statuses', () => {
    expect(countByStatus(['flaky', 'flaky'])).toEqual({ flaky: 2 });
  });
  it('returns {} for an empty list', () => {
    expect(countByStatus([])).toEqual({});
  });
});
