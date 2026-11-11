export const CURRENCY = 'UAH';

export function formatMoney(amount: number): string {
  return `${amount.toLocaleString('en-US')} ${CURRENCY}`;
}
