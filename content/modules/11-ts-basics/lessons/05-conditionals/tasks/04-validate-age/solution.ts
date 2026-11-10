export function validateAge(age: number): string {
  if (!Number.isInteger(age)) {
    return 'Age must be a whole number';
  }
  if (age < 18) {
    return 'Too young';
  }
  if (age > 65) {
    return 'Too old';
  }
  return 'OK';
}
