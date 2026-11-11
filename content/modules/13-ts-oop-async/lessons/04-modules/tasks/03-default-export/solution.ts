export const DEFAULT_ROLE = 'customer';

export default function createUser(email: string, role: string = DEFAULT_ROLE): { email: string; role: string } {
  return { email: email.toLowerCase(), role };
}
