export interface User {
  id: number;
  email: string;
  role: 'admin' | 'customer';
}

export function isUser(value: unknown): value is User {
  // твій код тут
}
