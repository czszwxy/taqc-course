export function describeValue(value: string | number | boolean): string {
  return typeof value + ': ' + value;
}
