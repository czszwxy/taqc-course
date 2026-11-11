import { statusIcon, type TestStatus } from './solution';

// Never called: only checks what the compiler allows.
export function compileTimeChecks(): void {
  // @ts-expect-error 'broken' is not a TestStatus
  statusIcon('broken');
  const ok: TestStatus = 'skipped';
  statusIcon(ok);
}

describe('statusIcon', () => {
  it('passed', () => expect(statusIcon('passed')).toBe('✅'));
  it('failed', () => expect(statusIcon('failed')).toBe('❌'));
  it('skipped', () => expect(statusIcon('skipped')).toBe('⏭'));
});
