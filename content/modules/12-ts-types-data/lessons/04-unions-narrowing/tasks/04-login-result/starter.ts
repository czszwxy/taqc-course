export type LoginResult =
  | { ok: true; token: string }
  | { ok: false; status: number; message: string };

export const UNAUTHORIZED = 401;
export const FORBIDDEN = 403;

export function describeLogin(result: LoginResult): string {
  // твій код тут
}

export function isAuthError(result: LoginResult): boolean {
  // твій код тут
}
