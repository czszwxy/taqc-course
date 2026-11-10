import { getMaxDuration } from './solution';

describe('getMaxDuration', () => {
  it('finds the maximum', () => {
    expect(getMaxDuration([1200, 850, 3100, 40])).toBe(3100);
  });

  it('maximum at the first position', () => {
    expect(getMaxDuration([9000, 10, 20])).toBe(9000);
  }, 'Перевір, що перший елемент теж бере участь у порівнянні.');

  it('maximum at the last position', () => {
    expect(getMaxDuration([10, 20, 9000])).toBe(9000);
  }, 'Перевір, що цикл доходить до останнього елемента.');

  it('single value', () => {
    expect(getMaxDuration([5])).toBe(5);
  });

  it('empty array → 0', () => {
    expect(getMaxDuration([])).toBe(0);
  }, 'Оброби порожній масив окремо.');
});
