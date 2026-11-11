import { passwordStrength, type Strength } from './subject';

const cases: [string, Strength][] = [
  ['Ab1', 'weak'],
  ['Ab1defg', 'weak'],
  ['Ab1defgh', 'strong'],
  ['secret123', 'medium'],
  ['SecretPass', 'medium'],
  ['password', 'medium'],
];

describe('passwordStrength', () => {
  for (const [password, expected] of cases) {
    it(`"${password}" is ${expected}`, () => {
      expect(passwordStrength(password)).toBe(expected);
    });
  }
});
