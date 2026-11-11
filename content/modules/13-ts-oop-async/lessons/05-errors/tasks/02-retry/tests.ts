import { retry } from './solution';

function flakyUntil(successOnCall: number): { fn: () => string; calls: () => number } {
  let calls = 0;
  return {
    fn: () => {
      calls++;
      if (calls < successOnCall) throw new Error(`fail ${calls}`);
      return 'ok';
    },
    calls: () => calls,
  };
}

describe('retry', () => {
  it('returns the first success and stops', () => {
    const f = flakyUntil(3);
    expect(retry(f.fn, 5)).toBe('ok');
    expect(f.calls()).toBe(3);
  }, 'Після першого успіху одразу return — не викликай fn зайвий раз.');
  it('succeeds on the last allowed attempt', () => {
    const f = flakyUntil(3);
    expect(retry(f.fn, 3)).toBe('ok');
  }, 'attempts = 3 означає рівно 3 виклики.');
  it('throws the last error when all attempts fail', () => {
    const f = flakyUntil(10);
    expect(() => retry(f.fn, 2)).toThrow('fail 2');
    expect(f.calls()).toBe(2);
  }, 'Кидай помилку саме з останньої спроби.');
  it('rejects attempts < 1 without calling fn', () => {
    const f = flakyUntil(1);
    expect(() => retry(f.fn, 0)).toThrow(RangeError);
    expect(f.calls()).toBe(0);
  });
  it('works on the first try', () => {
    expect(retry(() => 42, 1)).toBe(42);
  });
});
