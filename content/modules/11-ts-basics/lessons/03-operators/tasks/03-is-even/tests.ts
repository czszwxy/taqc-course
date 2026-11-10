import { isEven } from './solution';

describe('isEven', () => {
  it('4 is even', () => {
    expect(isEven(4)).toBe(true);
  });

  it('7 is odd', () => {
    expect(isEven(7)).toBe(false);
  }, 'Для непарних чисел остача від ділення на 2 дорівнює 1.');

  it('0 is even (boundary)', () => {
    expect(isEven(0)).toBe(true);
  }, '0 % 2 === 0, отже нуль парний.');

  it('negative numbers: -6 is even, -3 is odd', () => {
    expect(isEven(-6)).toBe(true);
    expect(isEven(-3)).toBe(false);
  }, 'У JS -3 % 2 дорівнює -1, а не 1. Тому перевіряй "=== 0", а не "=== 1".');

  it('returns a boolean, not a number', () => {
    expect(typeof isEven(10)).toBe('boolean');
  }, 'Поверни результат порівняння (true/false), а не саму остачу.');
});
