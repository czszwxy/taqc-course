import { getInitials } from './solution';

describe('getInitials', () => {
  it("'Ivan Petrenko' → 'IP'", () => {
    expect(getInitials('Ivan Petrenko')).toBe('IP');
  });

  it('upper-cases the initials', () => {
    expect(getInitials('ivan petrenko')).toBe('IP');
  });

  it('handles extra spaces', () => {
    expect(getInitials('  Olena   Kovalenko  ')).toBe('OK');
  }, "split(' ') дає порожні рядки на місці зайвих пробілів. Відфільтруй їх.");

  it('single word → one initial', () => {
    expect(getInitials('Taras')).toBe('T');
  }, 'У масиві лише одне слово, тому parts[1] — undefined. Оброби цей випадок.');

  it('uses the first and the LAST word', () => {
    expect(getInitials('Anna Maria Shevchenko')).toBe('AS');
  }, 'Останнє слово: words[words.length - 1].');

  it("no words → ''", () => {
    expect(getInitials('   ')).toBe('');
    expect(getInitials('')).toBe('');
  }, 'Якщо слів немає, поверни порожній рядок.');
});
