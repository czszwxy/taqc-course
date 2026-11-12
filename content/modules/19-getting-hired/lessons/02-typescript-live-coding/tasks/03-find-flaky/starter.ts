export interface RunRecord {
  test: string;
  status: 'passed' | 'failed';
}

export function findFlaky(history: RunRecord[]): string[] {
  // твій код тут
}
