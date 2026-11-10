import { validateAge } from './solution';

describe('validateAge', () => {
  it("a typical valid age → 'OK'", () => {
    expect(validateAge(30)).toBe('OK');
  });

  it("lower boundary: 18 → 'OK'", () => {
    expect(validateAge(18)).toBe('OK');
  }, '18 входить у діапазон. Перевір, що в тебе "< 18", а не "<= 18".');

  it("just below: 17 → 'Too young'", () => {
    expect(validateAge(17)).toBe('Too young');
  });

  it("upper boundary: 65 → 'OK'", () => {
    expect(validateAge(65)).toBe('OK');
  }, '65 входить у діапазон. Перевір, що в тебе "> 65", а не ">= 65".');

  it("just above: 66 → 'Too old'", () => {
    expect(validateAge(66)).toBe('Too old');
  });

  it('decimal numbers are rejected', () => {
    expect(validateAge(18.5)).toBe('Age must be a whole number');
    expect(validateAge(70.2)).toBe('Age must be a whole number');
  }, 'Перевірку Number.isInteger треба робити ПЕРШОЮ, інакше 70.2 дасть "Too old".');

  it("negative numbers and zero → 'Too young'", () => {
    expect(validateAge(0)).toBe('Too young');
    expect(validateAge(-5)).toBe('Too young');
  });
});
