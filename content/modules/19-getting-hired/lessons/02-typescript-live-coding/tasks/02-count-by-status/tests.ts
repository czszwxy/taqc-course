import { countByStatus, type TestResult } from './solution';

const run: TestResult[] = [
  { title: 'login', status: 'passed', durationMs: 900 },
  { title: 'cart', status: 'failed', durationMs: 1200 },
  { title: 'search', status: 'passed', durationMs: 700 },
  { title: 'todo', status: 'flaky', durationMs: 2100 },
  { title: 'order', status: 'skipped', durationMs: 0 },
];

describe('countByStatus', () => {
  it('counts every status', () => {
    expect(countByStatus(run)).toEqual({ passed: 2, failed: 1, skipped: 1, flaky: 1 });
  });

  it('returns zeros for an empty run', () => {
    expect(countByStatus([])).toEqual({ passed: 0, failed: 0, skipped: 0, flaky: 0 });
  }, 'Порожній масив → усі чотири ключі з нулями. Ініціалізуй об\'єкт до циклу.');

  it('keeps statuses that did not occur as 0', () => {
    expect(countByStatus([{ title: 'a', status: 'passed', durationMs: 1 }])).toEqual({ passed: 1, failed: 0, skipped: 0, flaky: 0 });
  }, 'Ключі failed / skipped / flaky мають бути навіть тоді, коли таких тестів немає.');

  it('does not change the input array', () => {
    const copy = run.map((r) => ({ ...r }));
    countByStatus(run);
    expect(run).toEqual(copy);
  }, 'Функція лише читає результати — не змінюй вхідні об\'єкти.');
});
