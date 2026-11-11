import { canRegister } from './subject';

const cases: [number, boolean][] = [
  [17, false],
  [18, true],
  [65, true],
  [66, false],
  [20.5, false],
];

describe('canRegister', () => {
  for (const [age, expected] of cases) {
    it(`age ${age} → ${expected}`, () => {
      expect(canRegister(age)).toBe(expected);
    });
  }
});
