const MIN_LENGTH = 8;
const MAX_LENGTH = 20;

export function passwordErrors(password: string): string[] {
  const errors: string[] = [];
  if (password.length < MIN_LENGTH) errors.push('too short');
  if (password.length > MAX_LENGTH) errors.push('too long');
  if (!/[0-9]/.test(password)) errors.push('needs a digit');
  if (!/[A-Z]/.test(password)) errors.push('needs an uppercase letter');
  if (password.includes(' ')) errors.push('no spaces allowed');
  return errors;
}
