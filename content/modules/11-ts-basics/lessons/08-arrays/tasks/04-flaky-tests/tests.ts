import { findFlakyTests } from './solution';

describe('findFlakyTests', () => {
  it('returns tests that failed in only one run', () => {
    expect(findFlakyTests(['login', 'cart', 'search'], ['cart', 'profile'])).toEqual(['login', 'search', 'profile']);
  }, 'Тест, що впав в обох прогонах (cart), не flaky.');

  it('keeps the order: run 1 first, then run 2', () => {
    expect(findFlakyTests(['b', 'a'], ['d', 'c'])).toEqual(['b', 'a', 'd', 'c']);
  });

  it('no flaky tests when both runs are the same', () => {
    expect(findFlakyTests(['x', 'y'], ['y', 'x'])).toEqual([]);
  });

  it('handles empty runs', () => {
    expect(findFlakyTests([], ['a'])).toEqual(['a']);
    expect(findFlakyTests(['a'], [])).toEqual(['a']);
    expect(findFlakyTests([], [])).toEqual([]);
  });

  it('does not mutate the inputs', () => {
    const r1 = ['login', 'cart'];
    const r2 = ['cart'];
    findFlakyTests(r1, r2);
    expect(r1).toEqual(['login', 'cart']);
    expect(r2).toEqual(['cart']);
  }, 'Додавай елементи в новий масив result, а не у вхідні.');
});
