// Цей файл — результат `git merge main` у гілці feature/blocked-user-tests.
// Git позначив два конфлікти. Розв'яжи їх за умовою завдання.

export interface TestUser {
  email: string;
  role: 'admin' | 'customer';
  blocked: boolean;
}

export const testUsers: Record<string, TestUser> = {
<<<<<<< HEAD
  admin: { email: 'qa.admin@gadgetly.test', role: 'admin', blocked: false },
  customer: { email: 'olena.kovalenko@gadgetly.test', role: 'customer', blocked: false },
=======
  admin: { email: 'admin@gadgetly.test', role: 'admin', blocked: false },
  customer: { email: 'olena.kovalenko@gadgetly.test', role: 'customer', blocked: false },
  blockedUser: { email: 'blocked.user@gadgetly.test', role: 'customer', blocked: true },
>>>>>>> feature/blocked-user-tests
};

export function loginUrl(baseUrl: string): string {
<<<<<<< HEAD
  return `${baseUrl}/auth/login`;
=======
  return `${baseUrl}/login?redirect=/cart`;
>>>>>>> feature/blocked-user-tests
}
