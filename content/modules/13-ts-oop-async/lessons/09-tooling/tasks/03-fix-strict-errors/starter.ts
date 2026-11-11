export interface User {
  id: number;
  email: string;
}

export function findEmail(users: User[], id: number): string {
  return users.find((u) => u.id === id).email;
}

export function sumDurations(durations) {
  return durations.reduce((sum, d) => sum + d, 0);
}

export function statusLabel(passed): string {
  if (passed) {
    return 'PASS';
  }
}
