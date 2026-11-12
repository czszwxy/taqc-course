export interface TestResult {
  title: string;
  durationMs: number;
}

export function slowestTests(results: TestResult[], n: number): string[] {
  return [...results]
    .sort((a, b) => b.durationMs - a.durationMs || a.title.localeCompare(b.title))
    .slice(0, n)
    .map((r) => r.title);
}
