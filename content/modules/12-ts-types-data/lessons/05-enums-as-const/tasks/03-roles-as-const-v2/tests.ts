import { statusName, type StatusName } from './solution';

export function compileTimeChecks(): void {
  // @ts-expect-error 'teapot' is not a StatusName
  const bad: StatusName = 'teapot';
  void bad;
}

describe('statusName', () => {
  it('finds names by code', () => {
    expect(statusName(200)).toBe('ok');
    expect(statusName(404)).toBe('notFound');
  });
  it('returns null for unknown codes', () => {
    expect(statusName(500)).toBeNull();
  });
});
