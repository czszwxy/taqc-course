import { countBy } from './solution';

describe('countBy', () => {
  it('counts by key', () => {
    expect(countBy([{ s: 'passed' }, { s: 'failed' }, { s: 'passed' }], (r) => r.s)).toEqual({ passed: 2, failed: 1 });
  });
  it('returns {} for an empty array', () => {
    expect(countBy([], () => 'x')).toEqual({});
  });
});
