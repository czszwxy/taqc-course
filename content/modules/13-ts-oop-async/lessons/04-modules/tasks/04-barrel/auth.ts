export type Role = 'admin' | 'customer';

export function loginAs(role: Role): string {
  return `Logged in as ${role}`;
}
