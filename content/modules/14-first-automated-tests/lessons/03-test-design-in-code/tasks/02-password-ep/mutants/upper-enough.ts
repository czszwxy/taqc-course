export type Strength = 'weak' | 'medium' | 'strong';

export const MIN_LENGTH = 8;

export function passwordStrength(password: string): Strength {
  if (password.length < MIN_LENGTH) return 'weak';
  const hasUpper = /[A-Z]/.test(password);
  return hasUpper ? 'strong' : 'medium';
}
