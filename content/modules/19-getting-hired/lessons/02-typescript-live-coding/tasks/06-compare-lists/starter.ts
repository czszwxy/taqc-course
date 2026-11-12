export interface ListDiff {
  missing: string[];
  unexpected: string[];
}

export function compareLists(expected: string[], actual: string[]): ListDiff {
  // твій код тут
}
