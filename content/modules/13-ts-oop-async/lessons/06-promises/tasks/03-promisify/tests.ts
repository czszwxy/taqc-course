import { loadUser } from './solution';

describe('loadUser', () => {
  it('resolves with the user', async () => {
    await expect(loadUser(1)).resolves.toEqual({ id: 1, name: 'Olena' });
  }, 'resolve(user) у колбеку, коли помилки немає.');
  it('rejects when the user does not exist', async () => {
    await expect(loadUser(99)).rejects.toThrow('User 99 not found');
  }, 'reject(error) у колбеку, коли error не null.');
  it('returns a Promise', () => {
    const p = loadUser(2);
    expect(p).toBeInstanceOf(Promise);
    return p.then(() => undefined);
  });
});
