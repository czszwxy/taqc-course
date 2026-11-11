export type LoginResult =
  | { ok: true; token: string }
  | { ok: false; status: number; message: string };

export const UNAUTHORIZED = 401;
export const FORBIDDEN = 403;

export function describeLogin(result: LoginResult): string {
  if (result.ok) return `Token: ${result.token}`;
  return `Error ${result.status}: ${result.message}`;
}

export function isAuthError(result: LoginResult): boolean {
  return !result.ok && (result.status === UNAUTHORIZED || result.status === FORBIDDEN);
}
