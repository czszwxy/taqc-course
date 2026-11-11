export interface UserWithSecrets {
  id: number;
  email: string;
  password: string;
  token: string;
}

export type SafeUser = { id: number; email: string };

export function toSafeUser(user: UserWithSecrets): SafeUser {
  // твій код тут
}

export function splitFirst(items: string[]): { first: string | undefined; rest: string[] } {
  // твій код тут
}
