export interface UserInput {
  name: string;
  email: string;
  role?: string;
}

export function formatUser({ name, email, role = 'customer' }: UserInput): string {
  return `${name} <${email}> (${role})`;
}
