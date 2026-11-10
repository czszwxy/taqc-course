import { maskSecret } from './solution';

describe('maskSecret', () => {
  it('keeps only the last 4 characters visible', () => {
    expect(maskSecret('mySecretToken1234')).toBe('*************1234');
  }, 'Останні 4 символи дає slice(-4), решту заміни на "*".');

  it('works for the minimum length (5)', () => {
    expect(maskSecret('abcde')).toBe('*bcde');
  });

  it('result has the same length as the input', () => {
    const secret = 'token-xyz-987654';
    expect(maskSecret(secret)).toHaveLength(secret.length);
  }, 'Кількість зірочок = secret.length - 4.');

  it('does not leak the beginning of the secret', () => {
    expect(maskSecret('PASSWORD99').startsWith('PASS')).toBe(false);
  }, 'Початок секрету не повинен з\'являтися в результаті.');
});
