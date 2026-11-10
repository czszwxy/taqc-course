export function findFlakyTests(run1Failed: string[], run2Failed: string[]): string[] {
  const result: string[] = [];
  for (const name of run1Failed) {
    if (!run2Failed.includes(name)) {
      result.push(name);
    }
  }
  for (const name of run2Failed) {
    if (!run1Failed.includes(name)) {
      result.push(name);
    }
  }
  return result;
}
