import { isMultipleOf } from './solution';

describe('isMultipleOf', () => {
  it('15 is a multiple of 5', () => {
    expect(isMultipleOf(15, 5)).toBe(true);
  });

  it('14 is not a multiple of 5', () => {
    expect(isMultipleOf(14, 5)).toBe(false);
  });

  it('0 is a multiple of any number', () => {
    expect(isMultipleOf(0, 3)).toBe(true);
  }, '0 % 3 === 0.');

  it('works with negative numbers: -12 is a multiple of 4', () => {
    expect(isMultipleOf(-12, 4)).toBe(true);
    expect(isMultipleOf(-13, 4)).toBe(false);
  }, 'Порівнюй остачу саме з 0: для від\'ємних чисел остача теж може бути від\'ємною.');
});
