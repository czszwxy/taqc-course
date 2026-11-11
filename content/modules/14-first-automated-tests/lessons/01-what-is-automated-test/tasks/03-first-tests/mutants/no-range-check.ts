export const MAX_PERCENT = 100;

export function discountedPrice(price: number, percent: number): number {
  return Math.round(price * (MAX_PERCENT - percent)) / MAX_PERCENT;
}
