export interface ListDiff {
  missing: string[];
  unexpected: string[];
}

export function compareLists(expected: string[], actual: string[]): ListDiff {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  return {
    missing: [...expectedSet].filter((value) => !actualSet.has(value)),
    unexpected: [...actualSet].filter((value) => !expectedSet.has(value)),
  };
}
