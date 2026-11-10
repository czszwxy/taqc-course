import { normalizeUsername } from './solution';

describe('normalizeUsername', () => {
  it("'  John Smith ' → 'john_smith'", () => {
    expect(normalizeUsername('  John Smith ')).toBe('john_smith');
  }, 'Спершу trim(), потім toLowerCase(), потім заміна пробілів.');

  it('replaces every inner space', () => {
    expect(normalizeUsername('QA Team Lead')).toBe('qa_team_lead');
  }, 'replace змінює лише перше входження. Потрібен replaceAll.');

  it('does not add underscores at the edges', () => {
    expect(normalizeUsername(' admin ')).toBe('admin');
  }, 'Пробіли по краях треба прибрати trim() ДО заміни.');
});
