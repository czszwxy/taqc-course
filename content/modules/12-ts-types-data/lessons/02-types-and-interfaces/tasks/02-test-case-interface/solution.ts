export interface TestCase {
  id: string;
  title: string;
  steps: string[];
  automated: boolean;
}

export function createTestCase(id: string, title: string): TestCase {
  return { id, title, steps: [], automated: false };
}
