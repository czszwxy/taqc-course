export const SHIPPING_FEE = 100;
export const FREE_FROM = 3000;
export const FREE_SHIPPING_CODE = 'FREESHIP';

export function shippingFee(subtotal: number, isMember: boolean, promo: string): number {
  const freeByCode = promo.trim().toUpperCase() === FREE_SHIPPING_CODE;
  const memberCounts = isMember && promo.trim() === '';
  const free = subtotal >= FREE_FROM || memberCounts || freeByCode;
  return free ? 0 : SHIPPING_FEE;
}
