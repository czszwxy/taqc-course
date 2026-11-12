import { findFlaky } from './solution';

describe('findFlaky', () => {
  it('finds a test that both passed and failed', () => {
    expect(
      findFlaky([
        { test: 'search', status: 'passed' },
        { test: 'search', status: 'failed' },
      ]),
    ).toEqual(['search']);
  });

  it('does not report always-failing or always-passing tests', () => {
    expect(
      findFlaky([
        { test: 'cart', status: 'failed' },
        { test: 'cart', status: 'failed' },
        { test: 'login', status: 'passed' },
      ]),
    ).toEqual([]);
  }, 'Стабільно червоний тест — не flaky, а справжнє падіння. Flaky = є і passed, і failed.');

  it('returns each name once, sorted A→Z', () => {
    expect(
      findFlaky([
        { test: 'todo', status: 'failed' },
        { test: 'cart', status: 'passed' },
        { test: 'todo', status: 'passed' },
        { test: 'cart', status: 'failed' },
        { test: 'todo', status: 'failed' },
        { test: 'cart', status: 'passed' },
      ]),
    ).toEqual(['cart', 'todo']);
  }, 'Прибери дублікати (Set) і відсортуй результат (.sort()).');

  it('returns an empty list for an empty history', () => {
    expect(findFlaky([])).toEqual([]);
  });
});
