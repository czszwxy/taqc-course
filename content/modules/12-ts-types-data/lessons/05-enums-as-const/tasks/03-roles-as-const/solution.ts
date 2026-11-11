export const ROLES = ['admin', 'customer', 'guest'] as const;

export type Role = (typeof ROLES)[number];

export function parseRole(value: string): Role | null {
  const normalized = value.trim().toLowerCase();
  return ROLES.find((r) => r === normalized) ?? null;
}
