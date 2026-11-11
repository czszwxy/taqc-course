import { findEmail, statusLabel, sumDurations } from './solution';

describe('fixed functions', () => {
  it('findEmail finds a user', () => {
    expect(findEmail([{ id: 1, email: 'a@b.c' }], 1)).toBe('a@b.c');
  });
  it('findEmail returns unknown for a missing user', () => {
    expect(findEmail([{ id: 1, email: 'a@b.c' }], 2)).toBe('unknown');
  }, "find повертає undefined — використай ?. і ?? 'unknown'.");
  it('sumDurations', () => {
    expect(sumDurations([100, 200])).toBe(300);
    expect(sumDurations([])).toBe(0);
  });
  it('statusLabel', () => {
    expect(statusLabel(true)).toBe('PASS');
    expect(statusLabel(false)).toBe('FAIL');
  }, 'Додай return для гілки, коли passed === false.');
});
