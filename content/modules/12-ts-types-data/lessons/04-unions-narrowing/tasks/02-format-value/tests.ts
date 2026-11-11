import { formatCell } from './solution';

describe('formatCell', () => {
  it('trims strings', () => {
    expect(formatCell('  Paid ')).toBe('Paid');
  });
  it('formats numbers with two decimals', () => {
    expect(formatCell(3.14159)).toBe('3.14');
    expect(formatCell(7)).toBe('7.00');
  }, 'Для числа використай value.toFixed(2).');
  it('formats booleans', () => {
    expect(formatCell(true)).toBe('yes');
    expect(formatCell(false)).toBe('no');
  });
  it('zero is a number, not "no"', () => {
    expect(formatCell(0)).toBe('0.00');
  }, 'Перевіряй тип через typeof, а не через truthy/falsy: 0 — це число.');
});
