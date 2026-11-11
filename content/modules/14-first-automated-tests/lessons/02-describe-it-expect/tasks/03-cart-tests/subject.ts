export interface CartLine {
  name: string;
  price: number;
  qty: number;
}

export const MIN_QTY = 1;
export const MAX_QTY = 10;

export function cartSummary(lines: CartLine[]): { count: number; total: number; names: string[] } {
  return {
    count: lines.reduce((sum, l) => sum + l.qty, 0),
    total: lines.reduce((sum, l) => sum + l.price * l.qty, 0),
    names: lines.map((l) => l.name),
  };
}

export function findLine(lines: CartLine[], name: string): CartLine | undefined {
  return lines.find((l) => l.name === name);
}

export function averagePrice(lines: CartLine[]): number {
  if (lines.length === 0) return 0;
  return lines.reduce((sum, l) => sum + l.price, 0) / lines.length;
}

export function parseQuantity(text: string): number {
  const n = Number(text.trim());
  if (!Number.isInteger(n) || n < MIN_QTY || n > MAX_QTY) {
    throw new Error(`Invalid quantity: ${text}`);
  }
  return n;
}
