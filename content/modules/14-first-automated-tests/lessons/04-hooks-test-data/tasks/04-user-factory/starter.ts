export interface TestUser {
  name: string;
  email: string;
  password: string;
  role: 'customer' | 'admin';
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  // твій код тут
}

export function resetUserFactory(): void {
  // твій код тут
}
