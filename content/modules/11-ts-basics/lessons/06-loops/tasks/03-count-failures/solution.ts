export function countFailures(results: string): number {
  let count = 0;
  for (const r of results) {
    if (r === 'F') {
      count++;
    }
  }
  return count;
}
