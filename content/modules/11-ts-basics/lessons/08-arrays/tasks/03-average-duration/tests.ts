import { getAverageDuration } from './solution';

describe('getAverageDuration', () => {
  it('[1000, 2000, 3000] → 2000', () => {
    expect(getAverageDuration([1000, 2000, 3000])).toBe(2000);
  });

  it('rounds the result: [100, 101] → 101', () => {
    expect(getAverageDuration([100, 101])).toBe(101);
  }, '100.5 треба округлити через Math.round.');

  it('single value', () => {
    expect(getAverageDuration([750])).toBe(750);
  });

  it('empty array → 0 (not NaN)', () => {
    expect(getAverageDuration([])).toBe(0);
  }, '0 / 0 дає NaN. Оброби порожній масив окремо.');
});
