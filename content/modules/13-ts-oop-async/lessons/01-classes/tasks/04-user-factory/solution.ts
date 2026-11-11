export interface TestUser {
  id: number;
  email: string;
  role: string;
}

export class UserFactory {
  static nextId = 1;

  static create(role: string): TestUser {
    const id = UserFactory.nextId;
    UserFactory.nextId += 1;
    return { id, email: `${role}${id}@gadgetly.test`, role };
  }

  static reset(): void {
    UserFactory.nextId = 1;
  }
}
