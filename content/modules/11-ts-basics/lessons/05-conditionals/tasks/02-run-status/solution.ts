export function getRunStatus(passed: number, failed: number): string {
  if (failed > 0) {
    return 'FAILED';
  }
  if (passed > 0) {
    return 'PASSED';
  }
  return 'NO TESTS';
}
