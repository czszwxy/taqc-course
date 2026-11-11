import { describeLogin, isAuthError } from './solution';

describe('describeLogin', () => {
  it('success', () => {
    expect(describeLogin({ ok: true, token: 'abc' })).toBe('Token: abc');
  });
  it('error', () => {
    expect(describeLogin({ ok: false, status: 401, message: 'Invalid password' })).toBe('Error 401: Invalid password');
  });
});

describe('isAuthError', () => {
  it('401 and 403 are auth errors', () => {
    expect(isAuthError({ ok: false, status: 401, message: '' })).toBe(true);
    expect(isAuthError({ ok: false, status: 403, message: '' })).toBe(true);
  });
  it('other errors are not', () => {
    expect(isAuthError({ ok: false, status: 500, message: 'Oops' })).toBe(false);
    expect(isAuthError({ ok: false, status: 404, message: '' })).toBe(false);
  });
  it('success is not an auth error', () => {
    expect(isAuthError({ ok: true, token: 'abc' })).toBe(false);
  }, 'Спочатку перевір, що це помилка: !result.ok.');
});
