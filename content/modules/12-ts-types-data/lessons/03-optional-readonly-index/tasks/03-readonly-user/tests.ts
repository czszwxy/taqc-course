import { withName, type TestUser } from './solution';

// Never called: only checks what the compiler allows.
export function compileTimeChecks(u: TestUser): void {
  // @ts-expect-error id must be readonly
  u.id = 2;
  // @ts-expect-error email must be readonly
  u.email = 'other@test.com';
  u.name = 'allowed';
}

describe('withName', () => {
  it('returns a user with the new name', () => {
    const u: TestUser = { id: 1, email: 'qa@gadgetly.test', name: 'Olena' };
    expect(withName(u, 'Olena T.')).toEqual({ id: 1, email: 'qa@gadgetly.test', name: 'Olena T.' });
  });

  it('does not change the original user', () => {
    const u: TestUser = { id: 1, email: 'qa@gadgetly.test', name: 'Olena' };
    withName(u, 'Changed');
    expect(u.name).toBe('Olena');
  }, 'Поверни копію: { ...user, name }.');
});
