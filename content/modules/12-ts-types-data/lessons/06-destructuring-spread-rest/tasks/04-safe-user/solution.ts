export interface UserWithSecrets {
  id: number;
  email: string;
  password: string;
  token: string;
}

export type SafeUser = { id: number; email: string };

export function toSafeUser(user: UserWithSecrets): SafeUser {
  const { password, token, ...safe } = user;
  void password;
  void token;
  return safe;
}

export function splitFirst(items: string[]): { first: string | undefined; rest: string[] } {
  const [first, ...rest] = items;
  return { first, rest };
}
