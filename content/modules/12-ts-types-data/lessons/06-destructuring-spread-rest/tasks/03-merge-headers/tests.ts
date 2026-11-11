import { mergeHeaders } from './solution';

describe('mergeHeaders', () => {
  it('merges several objects', () => {
    expect(mergeHeaders({ Accept: 'application/json' }, { Authorization: 'Bearer abc' })).toEqual({
      Accept: 'application/json',
      Authorization: 'Bearer abc',
    });
  }, 'Параметр має бути rest: (...sources: Record<string, string>[]).');
  it('later values win', () => {
    expect(mergeHeaders({ Accept: 'application/json' }, { Accept: 'text/plain' })).toEqual({ Accept: 'text/plain' });
  });
  it('returns {} without arguments', () => {
    expect(mergeHeaders()).toEqual({});
  });
  it('does not change the arguments', () => {
    const base = { Accept: 'application/json' };
    mergeHeaders(base, { Accept: 'x' });
    expect(base).toEqual({ Accept: 'application/json' });
  });
});
