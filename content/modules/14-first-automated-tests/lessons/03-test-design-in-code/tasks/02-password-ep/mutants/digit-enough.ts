export type Strength = 'weak' | 'medium' | 'strong';

export const MIN_LENGTH = 8;

export function passwordStrength(password: string): Strength {
  if (password.length < MIN_LENGTH) return 'weak';
  const hasDigit = /\d/.test(password);
  return hasDigit ? 'strong' : 'medium';
}
