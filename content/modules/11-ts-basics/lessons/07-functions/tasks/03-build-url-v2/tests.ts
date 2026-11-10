import { buildApiPath } from './solution';

describe('buildApiPath', () => {
  it("uses version 'v1' by default", () => {
    expect(buildApiPath('users')).toBe('/api/v1/users');
  });

  it('does not duplicate the slash', () => {
    expect(buildApiPath('/orders')).toBe('/api/v1/orders');
  }, 'Прибери "/" на початку endpoint.');

  it('accepts a custom version', () => {
    expect(buildApiPath('users', 'v2')).toBe('/api/v2/users');
  });
});
