import { groupBy } from './solution';

type Run = { title: string; status: string };
const runs: Run[] = [
  { title: 'login', status: 'passed' },
  { title: 'cart', status: 'failed' },
  { title: 'search', status: 'passed' },
];

describe('groupBy', () => {
  it('groups objects by a key', () => {
    expect(groupBy(runs, (r) => r.status)).toEqual({
      passed: [runs[0], runs[2]],
      failed: [runs[1]],
    });
  }, 'Для нового ключа спочатку створи порожній масив, потім push.');
  it('works with strings', () => {
    expect(groupBy(['apple', 'avocado', 'banana'], (w) => w[0] ?? '')).toEqual({ a: ['apple', 'avocado'], b: ['banana'] });
  });
  it('returns {} for an empty array', () => {
    expect(groupBy([], () => 'x')).toEqual({});
  });
  it('keeps the element type', () => {
    const groups = groupBy(runs, (r) => r.status);
    const titles: string[] = (groups['passed'] ?? []).map((r) => r.title);
    expect(titles).toEqual(['login', 'search']);
  });
});
