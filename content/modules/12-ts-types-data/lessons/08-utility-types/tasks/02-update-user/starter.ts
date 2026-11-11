export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'customer';
}

export type UserChanges = User;

export function updateUser(user: User, changes: UserChanges): User {
  // твій код тут
}
