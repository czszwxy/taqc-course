import { TestAccount } from './solution';

export function compileTimeChecks(a: TestAccount): void {
  // @ts-expect-error email must be readonly
  a.email = 'x@y.z';
  // @ts-expect-error password must be private
  void a.password;
}

describe('TestAccount', () => {
  it('stores the email', () => {
    expect(new TestAccount('qa@gadgetly.test', 'Test1234').email).toBe('qa@gadgetly.test');
  });
  it('logs in with the right password', () => {
    expect(new TestAccount('a', 'p').login('p')).toBe(true);
  });
  it('locks after 3 failed attempts', () => {
    const acc = new TestAccount('a', 'p');
    acc.login('x');
    acc.login('x');
    expect(acc.locked).toBe(false);
    acc.login('x');
    expect(acc.locked).toBe(true);
    expect(acc.login('p')).toBe(false);
  }, 'Блокування після 3 невдалих спроб: locked = failedLogins >= 3, і locked-акаунт не входить.');
  it('a successful login resets the counter', () => {
    const acc = new TestAccount('a', 'p');
    acc.login('x');
    acc.login('x');
    acc.login('p');
    acc.login('x');
    acc.login('x');
    expect(acc.locked).toBe(false);
  }, 'Після успішного входу failedLogins = 0.');
});
