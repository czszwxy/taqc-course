import { first, last } from './solution';

export function compileTimeChecks(): void {
  // @ts-expect-error first([1, 2]) is number | undefined, not string
  const s: string | undefined = first([1, 2]);
  const n: number | undefined = last([1, 2]);
  void s;
  void n;
}

describe('first', () => {
  it('returns the first element', () => {
    expect(first(['login', 'cart'])).toBe('login');
  });
  it('undefined for an empty array', () => {
    expect(first([])).toBeUndefined();
  });
});

describe('last', () => {
  it('returns the last element', () => {
    expect(last([10, 20, 30])).toBe(30);
  });
  it('undefined for an empty array', () => {
    expect(last([])).toBeUndefined();
  });
});
