import { firstFailing, hasAt, isNotEmpty, type NamedValidator, type Validator } from './solution';

const minLength3: Validator = (value) => value.length >= 3;
const rules: NamedValidator[] = [
  { name: 'required', check: isNotEmpty },
  { name: 'email', check: hasAt },
];

describe('validators', () => {
  it('isNotEmpty ignores spaces', () => {
    expect(isNotEmpty('   ')).toBe(false);
    expect(isNotEmpty(' a ')).toBe(true);
  }, 'Обріж пробіли через trim() перед перевіркою довжини.');
  it('hasAt checks for @', () => {
    expect(hasAt('a@b')).toBe(true);
    expect(hasAt('ab')).toBe(false);
  });
});

describe('firstFailing', () => {
  it('returns the first failing rule', () => {
    expect(firstFailing('   ', rules)).toBe('required');
    expect(firstFailing('olena', rules)).toBe('email');
  });
  it('returns null when all rules pass', () => {
    expect(firstFailing('olena@test.com', rules)).toBeNull();
  }, 'Якщо find нічого не знайшов — поверни null.');
  it('works with any Validator', () => {
    expect(firstFailing('ab', [{ name: 'min3', check: minLength3 }])).toBe('min3');
  });
  it('returns null for an empty list of rules', () => {
    expect(firstFailing('', [])).toBeNull();
  });
});
