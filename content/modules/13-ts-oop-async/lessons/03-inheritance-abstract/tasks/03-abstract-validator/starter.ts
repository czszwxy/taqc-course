export abstract class FieldValidator {
  constructor(readonly field: string) {}

  abstract check(value: string): string | null;

  validate(value: string): string | null {
    const problem = this.check(value);
    return problem ? `${this.field}: ${problem}` : null;
  }
}

// твій код тут: RequiredValidator і MaxLengthValidator
