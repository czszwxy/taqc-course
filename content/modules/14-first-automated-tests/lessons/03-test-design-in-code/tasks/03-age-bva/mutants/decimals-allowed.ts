export const MIN_AGE = 18;
export const MAX_AGE = 65;

export function canRegister(age: number): boolean {
  return age >= MIN_AGE && age <= MAX_AGE;
}
