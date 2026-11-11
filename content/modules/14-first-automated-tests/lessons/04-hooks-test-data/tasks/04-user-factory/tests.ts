import { createTestUser, resetUserFactory } from './solution';

describe('createTestUser', () => {
  beforeEach(() => {
    resetUserFactory();
  });

  it('returns valid defaults', () => {
    expect(createTestUser()).toEqual({ name: 'Test User', email: 'user1@gadgetly.test', password: 'Test1234', role: 'customer' });
  });
  it('creates unique emails', () => {
    const a = createTestUser();
    const b = createTestUser();
    expect(a.email).toBe('user1@gadgetly.test');
    expect(b.email).toBe('user2@gadgetly.test');
  }, 'Збільшуй лічильник при кожному виклику.');
  it('applies overrides', () => {
    expect(createTestUser({ role: 'admin', password: '' })).toEqual({
      name: 'Test User',
      email: 'user1@gadgetly.test',
      password: '',
      role: 'admin',
    });
  }, 'Розгорни overrides ПІСЛЯ значень за замовчуванням: { …defaults, ...overrides }.');
  it('can override the email too', () => {
    expect(createTestUser({ email: 'x@y.z' }).email).toBe('x@y.z');
  });
  it('reset starts from 1 again', () => {
    createTestUser();
    createTestUser();
    resetUserFactory();
    expect(createTestUser().email).toBe('user1@gadgetly.test');
  });
});
