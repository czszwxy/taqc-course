export const MIN_AGE = 18;
export const MAX_AGE = 65;

export function canRegister(age: number): boolean {
  return Number.isInteger(age) && age >= MIN_AGE - 1 && age <= MAX_AGE;
}
