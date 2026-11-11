import { failedTitles, findTest, type TestRun } from './solution';

const runs: TestRun[] = [
  { title: 'login works', status: 'passed', durationMs: 1200 },
  { title: 'cart total', status: 'failed', durationMs: 3400 },
  { title: 'search', status: 'passed', durationMs: 800 },
  { title: 'checkout', status: 'failed', durationMs: 5100 },
  { title: 'profile', status: 'skipped', durationMs: 0 },
];

describe('failedTitles', () => {
  it('returns titles of failed tests in order', () => {
    expect(failedTitles(runs)).toEqual(['cart total', 'checkout']);
  }, 'Відфільтруй за status === "failed", а потім візьми лише title через map.');

  it('ignores skipped tests', () => {
    expect(failedTitles(runs)).not.toContain('profile');
  });

  it('returns [] when nothing failed', () => {
    expect(failedTitles([runs[0] as TestRun])).toEqual([]);
  });
});

describe('findTest', () => {
  it('finds a test by title', () => {
    expect(findTest(runs, 'search')).toEqual({ title: 'search', status: 'passed', durationMs: 800 });
  });

  it('returns undefined when there is no such test', () => {
    expect(findTest(runs, 'unknown')).toBeUndefined();
  }, 'Метод find сам повертає undefined, якщо нічого не знайшов.');
});
