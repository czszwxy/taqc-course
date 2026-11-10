export function getPassRate(passed: number, total: number): number {
  return Math.round((passed / total) * 100);
}
