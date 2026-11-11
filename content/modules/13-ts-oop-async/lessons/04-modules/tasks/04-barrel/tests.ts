import { findUser, getUser, loginAs, USERS, type Role } from './solution';

const role: Role = 'admin';

describe('barrel', () => {
  it('re-exports loginAs and Role', () => {
    expect(loginAs(role)).toBe('Logged in as admin');
  });
  it('re-exports everything from data', () => {
    expect(USERS).toHaveLength(2);
    expect(findUser('qa@gadgetly.test')?.role).toBe('customer');
  }, "export * from './data' реекспортує і USERS, і findUser.");
  it('re-exports findUser as getUser', () => {
    expect(getUser('admin@gadgetly.test')?.role).toBe('admin');
  }, "Перейменування: export { findUser as getUser } from './data'.");
});
