import { countPassed } from './solution';

describe('countPassed', () => {
  it("'PPF' → 2", () => {
    expect(countPassed('PPF')).toBe(2);
  }, 'Перший символ (індекс 0) пропускається? Подивись, з чого починається i.');

  it("'P' → 1", () => {
    expect(countPassed('P')).toBe(1);
  }, 'Рядок з одного символу: єдиний індекс — 0.');

  it("'FFP' → 1", () => {
    expect(countPassed('FFP')).toBe(1);
  });

  it("'' → 0", () => {
    expect(countPassed('')).toBe(0);
  });

  it("'PFPFP' → 3 (first and last are P)", () => {
    expect(countPassed('PFPFP')).toBe(3);
  }, 'Перевір обидві межі: перший і останній символи.');
});
