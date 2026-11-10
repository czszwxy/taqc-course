import { countFailures } from './solution';

describe('countFailures', () => {
  it("'PPFPF' → 2", () => {
    expect(countFailures('PPFPF')).toBe(2);
  });

  it('no failures → 0', () => {
    expect(countFailures('PPP')).toBe(0);
  });

  it('empty results → 0', () => {
    expect(countFailures('')).toBe(0);
  });

  it('skipped tests are not failures', () => {
    expect(countFailures('SSFSS')).toBe(1);
  }, "Рахуй тільки 'F'.");

  it('counts failures at the very start and end', () => {
    expect(countFailures('FPPPF')).toBe(2);
  }, 'Перший і останній символи теж треба перевірити: стережися off-by-one.');
});
