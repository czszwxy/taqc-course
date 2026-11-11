export const MIN_AGE = 18;
export const MAX_AGE = 65;

export class ValidationError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateAge(age: number): void {
  if (!Number.isInteger(age) || age < MIN_AGE || age > MAX_AGE) {
    throw new ValidationError('age', 'Age must be an integer between 18 and 65');
  }
}
