import { getFixDeadlineDays } from './solution';

describe('getFixDeadlineDays', () => {
  it('maps every severity to its SLA', () => {
    expect(getFixDeadlineDays('blocker')).toBe(1);
    expect(getFixDeadlineDays('critical')).toBe(2);
    expect(getFixDeadlineDays('major')).toBe(7);
    expect(getFixDeadlineDays('minor')).toBe(30);
    expect(getFixDeadlineDays('trivial')).toBe(90);
  }, 'Перевір кожен case і числа з таблиці.');

  it('is case-insensitive', () => {
    expect(getFixDeadlineDays('Critical')).toBe(2);
    expect(getFixDeadlineDays('BLOCKER')).toBe(1);
  }, 'Переведи severity в нижній регістр перед switch.');

  it('ignores spaces around', () => {
    expect(getFixDeadlineDays('  major ')).toBe(7);
  }, 'Використай trim() перед switch.');

  it('returns -1 for unknown values', () => {
    expect(getFixDeadlineDays('urgent')).toBe(-1);
    expect(getFixDeadlineDays('')).toBe(-1);
  }, 'Додай гілку default: return -1.');
});
