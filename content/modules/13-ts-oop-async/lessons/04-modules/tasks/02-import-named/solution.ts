import { formatMoney } from './money';

export function priceLabel(name: string, price: number): string {
  return `${name} — ${formatMoney(price)}`;
}
