export const applyDiscount = (price: number, percent: number): number => {
  const discounted = price - (price * percent) / 100;
  return Math.round(discounted * 100) / 100;
};
