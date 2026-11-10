import { describeValue } from './solution';

describe('describeValue', () => {
  it("describes a string: 'hello' → 'string: hello'", () => {
    expect(describeValue('hello')).toBe('string: hello');
  }, 'Формат: тип, двокрапка, пробіл, значення.');

  it("describes a number: 42 → 'number: 42'", () => {
    expect(describeValue(42)).toBe('number: 42');
  }, 'Назву типу дає typeof value.');

  it("describes a boolean: true → 'boolean: true'", () => {
    expect(describeValue(true)).toBe('boolean: true');
  });

  it("works with an empty string → 'string: '", () => {
    expect(describeValue('')).toBe('string: ');
  }, 'Порожній рядок — теж string. Після двокрапки й пробілу нічого немає.');

  it("works with a decimal number: 19.99 → 'number: 19.99'", () => {
    expect(describeValue(19.99)).toBe('number: 19.99');
  });
});
