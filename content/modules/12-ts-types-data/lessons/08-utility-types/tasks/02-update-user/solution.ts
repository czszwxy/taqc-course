export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'customer';
}

export type UserChanges = Partial<Omit<User, 'id'>>;

export function updateUser(user: User, changes: UserChanges): User {
  return { ...user, ...changes };
}
