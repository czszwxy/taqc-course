import { isUser } from './solution';

describe('isUser', () => {
  it('accepts a valid user', () => expect(isUser({ id: 42, email: 'qa@gadgetly.test', role: 'customer' })).toBe(true));
  it('rejects an unknown role', () => expect(isUser({ id: 42, email: 'qa@gadgetly.test', role: 'manager' })).toBe(false));
  it('rejects wrong types', () => {
    expect(isUser({ id: '42', email: 'x', role: 'admin' })).toBe(false);
    expect(isUser(null)).toBe(false);
  });
});
