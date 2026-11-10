import { baseUrl, retries, headless } from './solution';

describe('environment config', () => {
  it("baseUrl is 'http://localhost:3000'", () => {
    expect(baseUrl).toBe('http://localhost:3000');
  }, 'Адреса — це рядок у лапках.');

  it('retries is the number 2', () => {
    expect(retries).toBe(2);
  }, 'Кількість — число без лапок: 2.');

  it('headless is false', () => {
    expect(headless).toBe(false);
  }, 'Логічне значення: false без лапок.');
});
