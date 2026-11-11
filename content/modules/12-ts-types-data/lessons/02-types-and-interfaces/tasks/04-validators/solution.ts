export type Validator = (value: string) => boolean;

export interface NamedValidator {
  name: string;
  check: Validator;
}

export const isNotEmpty: Validator = (value) => value.trim().length > 0;

export const hasAt: Validator = (value) => value.includes('@');

export function firstFailing(value: string, validators: NamedValidator[]): string | null {
  const failed = validators.find((v) => !v.check(value));
  return failed ? failed.name : null;
}
