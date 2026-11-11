export interface TestUser {
  readonly id: number;
  readonly email: string;
  name: string;
}

export function withName(user: TestUser, name: string): TestUser {
  return { ...user, name };
}
