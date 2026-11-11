import { FieldValidator, MaxLengthValidator, RequiredValidator } from './solution';

describe('RequiredValidator', () => {
  it('rejects empty and spaces', () => {
    expect(new RequiredValidator('email').validate('')).toBe('email: is required');
    expect(new RequiredValidator('email').validate('  ')).toBe('email: is required');
  });
  it('accepts text', () => {
    expect(new RequiredValidator('email').validate('a')).toBeNull();
  });
});

describe('MaxLengthValidator', () => {
  it('accepts the maximum length', () => {
    expect(new MaxLengthValidator('name', 5).validate('Olena')).toBeNull();
  }, 'Рівно max символів — дозволено (length > max, а не >=).');
  it('rejects longer values', () => {
    expect(new MaxLengthValidator('name', 5).validate('Olenka')).toBe('name: must be at most 5 characters');
  });
});

describe('polymorphism', () => {
  it('validators work through the base type', () => {
    const validators: FieldValidator[] = [new RequiredValidator('name'), new MaxLengthValidator('name', 3)];
    expect(validators.map((v) => v.validate('Olena'))).toEqual([null, 'name: must be at most 3 characters']);
  });
});
