export const BASE_URL = 'https://api.gadgetly.test';
export const UNAUTHORIZED = 401;

export async function login(email: string, password: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (response.status === UNAUTHORIZED) throw new Error('Invalid credentials');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = (await response.json()) as { token: string };
  return data.token;
}
