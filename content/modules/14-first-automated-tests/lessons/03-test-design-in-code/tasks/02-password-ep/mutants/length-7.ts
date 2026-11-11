export type Strength = 'weak' | 'medium' | 'strong';

export const MIN_LENGTH = 8;

export function passwordStrength(password: string): Strength {
  if (password.length < MIN_LENGTH - 1) return 'weak';
  const hasDigit = /\d/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  return hasDigit && hasUpper ? 'strong' : 'medium';
}
