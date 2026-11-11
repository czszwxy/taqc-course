import { toPreview, toPublic, type PublicUser, type UserPreview, type UserRecord } from './solution';

const user: UserRecord = { id: 42, name: 'Olena', email: 'qa@gadgetly.test', password: 'Test1234' };

export function compileTimeChecks(p: PublicUser, v: UserPreview): void {
  // @ts-expect-error PublicUser has no password
  void p.password;
  // @ts-expect-error UserPreview has no email
  void v.email;
}

describe('toPublic', () => {
  it('removes the password at runtime', () => {
    const p = toPublic(user);
    expect(p).toEqual({ id: 42, name: 'Olena', email: 'qa@gadgetly.test' });
    expect(p).not.toHaveProperty('password');
  }, 'Тип Omit не прибирає поле з об\'єкта. Використай rest: const { password, ...rest } = user.');
});

describe('toPreview', () => {
  it('keeps only id and name', () => {
    const v = toPreview(user);
    expect(v).toEqual({ id: 42, name: 'Olena' });
    expect(v).not.toHaveProperty('email');
  });
});
