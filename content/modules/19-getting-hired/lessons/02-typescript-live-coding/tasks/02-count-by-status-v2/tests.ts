import { slowestTests, type TestResult } from './solution';

const run: TestResult[] = [
  { title: 'login', durationMs: 900 },
  { title: 'checkout', durationMs: 4200 },
  { title: 'search', durationMs: 1500 },
  { title: 'cart', durationMs: 1500 },
  { title: 'todo', durationMs: 300 },
];

describe('slowestTests', () => {
  it('returns the n slowest titles, slowest first', () => {
    expect(slowestTests(run, 1)).toEqual(['checkout']);
  });

  it('breaks ties by title A→Z', () => {
    expect(slowestTests(run, 3)).toEqual(['checkout', 'cart', 'search']);
  }, 'search і cart мають однакову тривалість — тоді порядок за назвою: cart раніше за search.');

  it('returns all tests when n is larger than the run', () => {
    expect(slowestTests(run, 10)).toEqual(['checkout', 'cart', 'search', 'login', 'todo']);
  });

  it('returns an empty list for an empty run', () => {
    expect(slowestTests([], 3)).toEqual([]);
  });

  it('does not reorder the input array', () => {
    const before = run.map((r) => r.title);
    slowestTests(run, 2);
    expect(run.map((r) => r.title)).toEqual(before);
  }, 'sort() змінює масив, на якому його викликали. Сортуй копію: [...results].sort(…).');
});
