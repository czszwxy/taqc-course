export const STATUS = { ok: 200, created: 201, badRequest: 400, notFound: 404 } as const;

export type StatusName = keyof typeof STATUS;

export function statusName(code: number): StatusName | null {
  const names = Object.keys(STATUS) as StatusName[];
  return names.find((n) => STATUS[n] === code) ?? null;
}
