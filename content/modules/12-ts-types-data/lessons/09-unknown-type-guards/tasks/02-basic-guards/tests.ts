import { isNonEmptyString, isPositiveInteger } from './solution';

describe('isNonEmptyString', () => {
  it('accepts text', () => expect(isNonEmptyString('  qa ')).toBe(true));
  it('rejects spaces only', () => expect(isNonEmptyString('   ')).toBe(false));
  it('rejects non-strings', () => {
    expect(isNonEmptyString(42)).toBe(false);
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
  });
  it('narrows the type', () => {
    const v: unknown = ' Mouse ';
    if (isNonEmptyString(v)) expect(v.trim()).toBe('Mouse');
  });
});

describe('isPositiveInteger', () => {
  it('accepts positive integers', () => expect(isPositiveInteger(3)).toBe(true));
  it('rejects 0 and negatives', () => {
    expect(isPositiveInteger(0)).toBe(false);
    expect(isPositiveInteger(-1)).toBe(false);
  }, 'Більше за 0 — отже 0 не підходить.');
  it('rejects decimals', () => expect(isPositiveInteger(2.5)).toBe(false));
  it('rejects numeric strings', () => expect(isPositiveInteger('3')).toBe(false), "'3' — це рядок. Перевір typeof value === 'number'.");
  it('rejects NaN', () => expect(isPositiveInteger(Number.NaN)).toBe(false));
});
