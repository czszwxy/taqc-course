import { loadUserLegacy, type User } from './legacy';

export function loadUser(id: number): Promise<User> {
  return new Promise((resolve, reject) => {
    loadUserLegacy(id, (error, user) => {
      if (error || !user) reject(error ?? new Error('No user'));
      else resolve(user);
    });
  });
}
