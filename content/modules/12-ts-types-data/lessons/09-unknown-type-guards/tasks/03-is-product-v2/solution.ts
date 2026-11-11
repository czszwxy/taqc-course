export interface User {
  id: number;
  email: string;
  role: 'admin' | 'customer';
}

export function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'number' && typeof v.email === 'string' && (v.role === 'admin' || v.role === 'customer');
}
