import { getUser, type User } from './users-api';

export function loadUsers(ids: number[]): Promise<User[]> {
  return Promise.all(ids.map((id) => getUser(id)));
}
