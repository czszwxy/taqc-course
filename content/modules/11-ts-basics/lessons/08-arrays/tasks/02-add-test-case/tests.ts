import { addTestCase } from './solution';

describe('addTestCase', () => {
  it('adds a new test case to the end', () => {
    expect(addTestCase(['login', 'logout'], 'signup')).toEqual(['login', 'logout', 'signup']);
  });

  it('does not mutate the original suite', () => {
    const suite = ['login', 'logout'];
    addTestCase(suite, 'signup');
    expect(suite).toEqual(['login', 'logout']);
  }, 'push змінює оригінал. Використай [...suite, testCase].');

  it('returns a different array instance', () => {
    const suite = ['login'];
    const result = addTestCase(suite, 'login');
    expect(result === suite).toBe(false);
  }, 'Навіть коли нічого не додаємо, повертай копію: [...suite].');

  it('does not add duplicates', () => {
    expect(addTestCase(['login', 'logout'], 'login')).toEqual(['login', 'logout']);
  }, 'Перевір дубль через includes.');

  it('works with an empty suite', () => {
    expect(addTestCase([], 'smoke')).toEqual(['smoke']);
  });
});
