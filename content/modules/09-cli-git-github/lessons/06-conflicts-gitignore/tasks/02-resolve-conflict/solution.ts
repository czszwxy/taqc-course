export interface TestUser {
  email: string;
  role: 'admin' | 'customer';
  blocked: boolean;
}

export const testUsers: Record<string, TestUser> = {
  admin: { email: 'qa.admin@gadgetly.test', role: 'admin', blocked: false },
  customer: { email: 'olena.kovalenko@gadgetly.test', role: 'customer', blocked: false },
  blockedUser: { email: 'blocked.user@gadgetly.test', role: 'customer', blocked: true },
};

export function loginUrl(baseUrl: string): string {
  return `${baseUrl}/auth/login?redirect=/cart`;
}
