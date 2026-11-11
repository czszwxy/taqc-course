export interface TestUser {
  name: string;
  email: string;
  password: string;
  role: 'customer' | 'admin';
}

let counter = 0;

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  counter += 1;
  return {
    name: 'Test User',
    email: `user${counter}@gadgetly.test`,
    password: 'Test1234',
    role: 'customer',
    ...overrides,
  };
}

export function resetUserFactory(): void {
  counter = 0;
}
