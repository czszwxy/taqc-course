export interface User {
  id: number;
  email: string;
}

export function findEmail(users: User[], id: number): string {
  return users.find((u) => u.id === id)?.email ?? 'unknown';
}

export function sumDurations(durations: number[]): number {
  return durations.reduce((sum, d) => sum + d, 0);
}

export function statusLabel(passed: boolean): string {
  if (passed) {
    return 'PASS';
  }
  return 'FAIL';
}
