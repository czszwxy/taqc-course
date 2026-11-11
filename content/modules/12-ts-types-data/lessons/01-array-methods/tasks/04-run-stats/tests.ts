import { hasFailures, slowest, totalDuration, type TestRun } from './solution';

const runs: TestRun[] = [
  { title: 'login works', status: 'passed', durationMs: 1200 },
  { title: 'cart total', status: 'failed', durationMs: 3400 },
  { title: 'search', status: 'passed', durationMs: 800 },
  { title: 'checkout', status: 'failed', durationMs: 5100 },
];

describe('totalDuration', () => {
  it('sums all durations', () => {
    expect(totalDuration(runs)).toBe(10500);
  });
  it('is 0 for no runs', () => {
    expect(totalDuration([])).toBe(0);
  }, 'Дай reduce початкове значення 0 — інакше порожній масив дасть помилку.');
});

describe('hasFailures', () => {
  it('true when at least one test failed', () => {
    expect(hasFailures(runs)).toBe(true);
  });
  it('false when all passed', () => {
    expect(hasFailures(runs.filter((r) => r.status === 'passed'))).toBe(false);
  });
  it('false for no runs', () => {
    expect(hasFailures([])).toBe(false);
  });
});

describe('slowest', () => {
  it('returns titles of the slowest tests, slowest first', () => {
    expect(slowest(runs, 2)).toEqual(['checkout', 'cart total']);
  }, 'Сортуй за спаданням: (a, b) => b.durationMs - a.durationMs.');
  it('returns all titles when count is bigger than the list', () => {
    expect(slowest(runs, 10)).toEqual(['checkout', 'cart total', 'login works', 'search']);
  });
  it('does not change the original array', () => {
    const copy = runs.map((r) => r.title);
    slowest(runs, 2);
    expect(runs.map((r) => r.title)).toEqual(copy);
  }, 'sort змінює масив! Сортуй копію: [...runs].sort(...).');
});
