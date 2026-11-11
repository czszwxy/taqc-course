import { parseRole, ROLES, type Role } from './solution';

export function compileTimeChecks(): void {
  const r: Role = 'customer';
  // @ts-expect-error 'manager' is not a Role
  const bad: Role = 'manager';
  void r;
  void bad;
}

describe('ROLES & Role', () => {
  it('has three roles', () => {
    expect(ROLES).toEqual(['admin', 'customer', 'guest']);
  });
});

describe('parseRole', () => {
  it('finds a role ignoring case and spaces', () => {
    expect(parseRole('Admin ')).toBe('admin');
    expect(parseRole('GUEST')).toBe('guest');
  }, 'Нормалізуй: value.trim().toLowerCase().');
  it('returns null for unknown roles', () => {
    expect(parseRole('manager')).toBeNull();
    expect(parseRole('')).toBeNull();
  });
});
