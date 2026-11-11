import { splitFirst, toSafeUser } from './solution';

describe('toSafeUser', () => {
  it('removes password and token', () => {
    const safe = toSafeUser({ id: 42, email: 'qa@gadgetly.test', password: 'Test1234', token: 'abc' });
    expect(safe).toEqual({ id: 42, email: 'qa@gadgetly.test' });
    expect(safe).not.toHaveProperty('password');
    expect(safe).not.toHaveProperty('token');
  }, 'const { password, token, ...safe } = user — і поверни safe.');
  it('does not change the original object', () => {
    const user = { id: 1, email: 'a@b.c', password: 'p', token: 't' };
    toSafeUser(user);
    expect(user.password).toBe('p');
  });
});

describe('splitFirst', () => {
  it('splits the first element from the rest', () => {
    expect(splitFirst(['login', 'cart', 'search'])).toEqual({ first: 'login', rest: ['cart', 'search'] });
  });
  it('works for an empty array', () => {
    expect(splitFirst([])).toEqual({ first: undefined, rest: [] });
  });
});
