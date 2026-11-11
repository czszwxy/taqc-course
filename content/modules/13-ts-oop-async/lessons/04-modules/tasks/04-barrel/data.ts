export const USERS = [
  { email: 'qa@gadgetly.test', role: 'customer' },
  { email: 'admin@gadgetly.test', role: 'admin' },
];

export function findUser(email: string): { email: string; role: string } | undefined {
  return USERS.find((u) => u.email === email);
}
