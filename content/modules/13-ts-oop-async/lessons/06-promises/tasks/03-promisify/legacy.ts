export interface User {
  id: number;
  name: string;
}

const USERS: User[] = [
  { id: 1, name: 'Olena' },
  { id: 2, name: 'Taras' },
];

const LATENCY_MS = 10;

/** An old callback-style API: (error, user) => void. */
export function loadUserLegacy(id: number, callback: (error: Error | null, user?: User) => void): void {
  setTimeout(() => {
    const user = USERS.find((u) => u.id === id);
    if (user) callback(null, user);
    else callback(new Error(`User ${id} not found`));
  }, LATENCY_MS);
}
