export interface OrderItem {
  productId: number;
  quantity: number;
}

export interface Order {
  id: number;
  items: OrderItem[];
}

function isOrderItem(v: unknown): v is OrderItem {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.productId === 'number' && typeof r.quantity === 'number';
}

export function parseOrder(json: string): Order | null {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const r = data as Record<string, unknown>;
  if (typeof r.id !== 'number' || !Array.isArray(r.items) || !r.items.every(isOrderItem)) return null;
  return { id: r.id, items: r.items.map(({ productId, quantity }) => ({ productId, quantity })) };
}
