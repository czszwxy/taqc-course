import { getPassRate } from './solution';

describe('getPassRate', () => {
  it('45 of 50 → 90', () => {
    expect(getPassRate(45, 50)).toBe(90);
  }, 'Формула: (passed / total) * 100.');

  it('all passed: 10 of 10 → 100', () => {
    expect(getPassRate(10, 10)).toBe(100);
  });

  it('none passed: 0 of 10 → 0', () => {
    expect(getPassRate(0, 10)).toBe(0);
  });

  it('rounds down when below .5: 1 of 3 → 33', () => {
    expect(getPassRate(1, 3)).toBe(33);
  }, 'Результат треба округлити до цілого: Math.round.');

  it('rounds up when .5 or more: 2 of 3 → 67', () => {
    expect(getPassRate(2, 3)).toBe(67);
  }, 'Math.floor дасть 66. Потрібне округлення до найближчого: Math.round.');
});
