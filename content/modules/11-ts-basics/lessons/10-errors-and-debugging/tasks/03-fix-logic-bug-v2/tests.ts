import { getAverage } from './solution';

describe('getAverage', () => {
  it('[10, 20, 30] → 20', () => {
    expect(getAverage([10, 20, 30])).toBe(20);
  }, 'Сума 60, елементів 3. На що ти ділиш?');

  it('[5] → 5', () => {
    expect(getAverage([5])).toBe(5);
  });

  it('[] → 0', () => {
    expect(getAverage([])).toBe(0);
  });

  it('[1, 2] → 2 (1.5 rounds up)', () => {
    expect(getAverage([1, 2])).toBe(2);
  });
});
