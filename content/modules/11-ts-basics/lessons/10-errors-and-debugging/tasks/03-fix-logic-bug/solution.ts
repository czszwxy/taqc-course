export function countPassed(results: string): number {
  let count = 0;
  for (let i = 0; i < results.length; i++) {
    if (results[i] === 'P') {
      count++;
    }
  }
  return count;
}
