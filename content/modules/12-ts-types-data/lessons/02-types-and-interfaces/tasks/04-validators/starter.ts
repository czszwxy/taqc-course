// твій код тут: export type Validator = …

// твій код тут: export interface NamedValidator …

export const isNotEmpty: Validator = (value) => {
  // твій код тут
};

export const hasAt: Validator = (value) => {
  // твій код тут
};

export function firstFailing(value: string, validators: NamedValidator[]): string | null {
  // твій код тут
}
