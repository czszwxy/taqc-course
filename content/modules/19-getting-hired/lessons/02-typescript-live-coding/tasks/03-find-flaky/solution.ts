export interface RunRecord {
  test: string;
  status: 'passed' | 'failed';
}

export function findFlaky(history: RunRecord[]): string[] {
  const passed = new Set<string>();
  const failed = new Set<string>();
  for (const record of history) {
    if (record.status === 'passed') passed.add(record.test);
    else failed.add(record.test);
  }
  return [...passed].filter((name) => failed.has(name)).sort();
}
