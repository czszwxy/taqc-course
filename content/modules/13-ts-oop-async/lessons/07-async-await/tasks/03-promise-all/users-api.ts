export interface User {
  id: number;
  name: string;
}

const USERS: User[] = [
  { id: 1, name: 'Olena' },
  { id: 2, name: 'Taras' },
  { id: 3, name: 'Iryna' },
  { id: 4, name: 'Andrii' },
  { id: 5, name: 'Sofia' },
];

export const LATENCY_MS = 80;

export function getUser(id: number): Promise<User> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = USERS.find((u) => u.id === id);
      if (user) resolve(user);
      else reject(new Error(`User ${id} not found`));
    }, LATENCY_MS);
  });
}
