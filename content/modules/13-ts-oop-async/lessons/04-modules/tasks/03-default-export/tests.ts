import createUser, { DEFAULT_ROLE } from './solution';

describe('createUser (default export)', () => {
  it('defaults the role', () => {
    expect(createUser('QA@Gadgetly.test')).toEqual({ email: 'qa@gadgetly.test', role: 'customer' });
    expect(DEFAULT_ROLE).toBe('customer');
  }, 'createUser має бути default export: export default function createUser(...).');
  it('uses the given role', () => {
    expect(createUser('admin@gadgetly.test', 'admin')).toEqual({ email: 'admin@gadgetly.test', role: 'admin' });
  });
});
