export function formatCell(value: string | number | boolean): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return value.toFixed(2);
  return value ? 'yes' : 'no';
}
