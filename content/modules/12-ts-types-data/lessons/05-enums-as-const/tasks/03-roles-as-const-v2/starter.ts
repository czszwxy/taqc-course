export const STATUS = { ok: 200, created: 201, badRequest: 400, notFound: 404 };

export type StatusName = string;

export function statusName(code: number): StatusName | null {
  // твій код тут
}
