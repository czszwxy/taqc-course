export const MAX_PERCENT = 100;

export function discountedPrice(price: number, percent: number): number {
  if (percent < 0 || percent > MAX_PERCENT) {
    throw new RangeError('percent must be between 0 and 100');
  }
  return Math.round(price * percent) / MAX_PERCENT;
}
