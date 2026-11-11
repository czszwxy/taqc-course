export abstract class FieldValidator {
  constructor(readonly field: string) {}

  abstract check(value: string): string | null;

  validate(value: string): string | null {
    const problem = this.check(value);
    return problem ? `${this.field}: ${problem}` : null;
  }
}

export class RequiredValidator extends FieldValidator {
  check(value: string): string | null {
    return value.trim() ? null : 'is required';
  }
}

export class MaxLengthValidator extends FieldValidator {
  constructor(
    field: string,
    private readonly max: number,
  ) {
    super(field);
  }

  check(value: string): string | null {
    return value.length > this.max ? `must be at most ${this.max} characters` : null;
  }
}
