import { getRunStatus } from './solution';

describe('getRunStatus', () => {
  it("all passed → 'PASSED'", () => {
    expect(getRunStatus(10, 0)).toBe('PASSED');
  });

  it("one failure → 'FAILED'", () => {
    expect(getRunStatus(9, 1)).toBe('FAILED');
  });

  it("only failures → 'FAILED'", () => {
    expect(getRunStatus(0, 3)).toBe('FAILED');
  }, 'Якщо є упалі тести, статус завжди FAILED.');

  it("no tests at all → 'NO TESTS'", () => {
    expect(getRunStatus(0, 0)).toBe('NO TESTS');
  }, 'Порожній прогін — це не PASSED. Додай окрему гілку.');

  it("many passed and one failed is still 'FAILED'", () => {
    expect(getRunStatus(500, 1)).toBe('FAILED');
  }, 'Перевіряй failed > 0 першим.');
});
