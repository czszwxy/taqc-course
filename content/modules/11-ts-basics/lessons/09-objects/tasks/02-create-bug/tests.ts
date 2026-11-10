import { createBug } from './solution';

describe('createBug', () => {
  it('creates a bug with all fields', () => {
    expect(createBug(101, 'Login fails', 'Critical')).toEqual({
      id: 101,
      title: 'Login fails',
      severity: 'Critical',
      status: 'Open',
    });
  }, 'Об\'єкт має містити рівно 4 властивості: id, title, severity, status.');

  it("a new bug always has status 'Open'", () => {
    expect(createBug(1, 'Typo on button', 'Trivial').status).toBe('Open');
  });

  it('trims the title', () => {
    expect(createBug(7, '  Cart total is wrong ', 'Major').title).toBe('Cart total is wrong');
  }, 'Використай title.trim().');

  it('returns a new object on every call', () => {
    const a = createBug(1, 'A', 'Minor');
    const b = createBug(1, 'A', 'Minor');
    expect(a === b).toBe(false);
  });
});
