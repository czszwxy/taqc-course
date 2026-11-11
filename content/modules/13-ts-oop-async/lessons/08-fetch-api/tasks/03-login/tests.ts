import { login } from './solution';

describe('login', () => {
  it('returns the token', async () => {
    expect(await login('qa@gadgetly.test', 'Test1234')).toBe('test-token-42');
  }, 'POST з method, headers і body: JSON.stringify({ email, password }).');
  it('wrong password → Invalid credentials', async () => {
    await expect(login('qa@gadgetly.test', 'wrong')).rejects.toThrow('Invalid credentials');
  });
  it('unknown user → Invalid credentials', async () => {
    await expect(login('nobody@gadgetly.test', 'Test1234')).rejects.toThrow('Invalid credentials');
  });
});
