import { validateAge, ValidationError } from './solution';

function caught(fn: () => void): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('ValidationError', () => {
  it('is an Error with field and name', () => {
    const e = new ValidationError('email', 'Bad email');
    expect(e).toBeInstanceOf(Error);
    expect(e.field).toBe('email');
    expect(e.message).toBe('Bad email');
    expect(e.name).toBe('ValidationError');
  }, "Не забудь super(message) і this.name = 'ValidationError'.");
});

describe('validateAge', () => {
  it('accepts the boundaries 18 and 65', () => {
    expect(() => validateAge(18)).not.toThrow();
    expect(() => validateAge(65)).not.toThrow();
  });
  it('rejects 17, 66 and decimals with a ValidationError', () => {
    expect(() => validateAge(17)).toThrow(ValidationError);
    expect(() => validateAge(66)).toThrow(ValidationError);
    expect(() => validateAge(20.5)).toThrow(ValidationError);
  });
  it('the error names the field', () => {
    const e = caught(() => validateAge(10));
    expect(e).toBeInstanceOf(ValidationError);
    expect((e as ValidationError).field).toBe('age');
    expect((e as ValidationError).message).toBe('Age must be an integer between 18 and 65');
  });
});
