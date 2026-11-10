export function addTestCase(suite: string[], testCase: string): string[] {
  if (suite.includes(testCase)) {
    return [...suite];
  }
  return [...suite, testCase];
}
