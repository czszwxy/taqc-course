export const ERROR_FROM = 400;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function assertOk(status: number, body: string): void {
  if (status >= ERROR_FROM) throw new HttpError(status, `HTTP ${status}: ${body}`);
}
