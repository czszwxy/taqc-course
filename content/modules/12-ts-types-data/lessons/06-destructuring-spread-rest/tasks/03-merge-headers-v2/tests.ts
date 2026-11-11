import { average } from './solution';

describe('average', () => {
  it('averages the arguments', () => {
    expect(average(100, 200, 600)).toBe(300);
  }, 'Параметр має бути rest: (...durations: number[]).');
  it('one value', () => {
    expect(average(42)).toBe(42);
  });
  it('0 without arguments', () => {
    expect(average()).toBe(0);
  }, 'Без аргументів ділення на 0 дасть NaN — поверни 0 окремо.');
});
