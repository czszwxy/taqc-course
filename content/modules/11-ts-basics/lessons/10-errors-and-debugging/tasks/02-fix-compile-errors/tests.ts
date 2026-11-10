import { getReportLine } from './solution';

describe('getReportLine', () => {
  it("'Login', 9 of 10 → 'Login: 90% NEEDS ATTENTION'", () => {
    expect(getReportLine('Login', 9, 10)).toBe('Login: 90% NEEDS ATTENTION');
  }, 'Якщо бачиш ReferenceError, у коді ще є опечатка в назві змінної.');

  it("'Cart', 5 of 5 → 'Cart: 100% OK'", () => {
    expect(getReportLine('Cart', 5, 5)).toBe('Cart: 100% OK');
  });

  it('returns a string', () => {
    expect(typeof getReportLine('API', 1, 2)).toBe('string');
  });
});
