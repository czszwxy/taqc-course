import { emptyTotals, totals, type Totals } from './solution';

const typed: Totals = { passed: 1, failed: 0, skipped: 0 };

describe('emptyTotals', () => {
  it('has all statuses with 0', () => {
    expect(emptyTotals()).toEqual({ passed: 0, failed: 0, skipped: 0 });
  });
  it('returns a new object every time', () => {
    const a = emptyTotals();
    a.passed = 5;
    expect(emptyTotals().passed).toBe(0);
  });
});

describe('totals', () => {
  it('counts statuses and keeps zeros', () => {
    expect(totals(['passed', 'passed', 'failed'])).toEqual({ passed: 2, failed: 1, skipped: 0 });
  }, 'Почни з emptyTotals(), щоб відсутні статуси були 0.');
  it('all zeros for no statuses', () => {
    expect(totals([])).toEqual({ passed: 0, failed: 0, skipped: 0 });
  });
  it('Totals type matches the result', () => {
    expect(typed.passed).toBe(1);
  });
});
