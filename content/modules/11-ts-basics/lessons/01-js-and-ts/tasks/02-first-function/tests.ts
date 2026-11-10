import { getGreeting } from './solution';

describe('getGreeting', () => {
  it('returns a string', () => {
    expect(typeof getGreeting()).toBe('string');
  }, 'Функція має повертати рядок: напиши return і текст у лапках.');

  it("returns exactly 'Hello, QA world!'", () => {
    expect(getGreeting()).toBe('Hello, QA world!');
  }, 'Порівняй кожен символ з умовою: велика H, кома, пробіл, знак оклику в кінці.');
});
