import { sumUpTo } from './solution';

describe('sumUpTo', () => {
  it('sumUpTo(4) → 10', () => {
    expect(sumUpTo(4)).toBe(10);
  }, '1 + 2 + 3 + 4 = 10. Чи включаєш ти n у суму (i <= n)?');

  it('sumUpTo(1) → 1', () => {
    expect(sumUpTo(1)).toBe(1);
  });

  it('sumUpTo(0) → 0 (boundary)', () => {
    expect(sumUpTo(0)).toBe(0);
  }, 'Для 0 цикл не має виконатися жодного разу.');

  it('sumUpTo(100) → 5050', () => {
    expect(sumUpTo(100)).toBe(5050);
  });
});
