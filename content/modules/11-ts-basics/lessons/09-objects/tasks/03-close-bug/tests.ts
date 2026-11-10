import { closeBug, type Bug } from './solution';

const makeBug = (): Bug => ({ id: 5, title: 'Crash on save', severity: 'Major', status: 'Open' });

describe('closeBug', () => {
  it("returns a bug with status 'Closed'", () => {
    expect(closeBug(makeBug()).status).toBe('Closed');
  });

  it('keeps all other fields', () => {
    expect(closeBug(makeBug())).toEqual({ id: 5, title: 'Crash on save', severity: 'Major', status: 'Closed' });
  }, 'Скопіюй усі властивості через { ...bug }.');

  it('does not mutate the original bug', () => {
    const bug = makeBug();
    closeBug(bug);
    expect(bug.status).toBe('Open');
  }, "bug.status = 'Closed' змінює оригінал. Поверни { ...bug, status: 'Closed' }.");

  it('returns a new object', () => {
    const bug = makeBug();
    expect(closeBug(bug) === bug).toBe(false);
  });
});
