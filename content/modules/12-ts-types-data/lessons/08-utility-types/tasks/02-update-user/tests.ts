import { updateUser, type User } from './solution';

const u: User = { id: 42, name: 'Olena', email: 'qa@gadgetly.test', role: 'customer' };

export function compileTimeChecks(): void {
  // @ts-expect-error id can not be changed
  updateUser(u, { id: 2 });
  updateUser(u, {});
}

describe('updateUser', () => {
  it('changes one field', () => {
    expect(updateUser(u, { name: 'Olena T.' })).toEqual({ ...u, name: 'Olena T.' });
  });
  it('changes several fields', () => {
    expect(updateUser(u, { role: 'admin', email: 'x@y.z' })).toEqual({ id: 42, name: 'Olena', email: 'x@y.z', role: 'admin' });
  });
  it('does not change the original', () => {
    updateUser(u, { name: 'X' });
    expect(u.name).toBe('Olena');
  });
});
