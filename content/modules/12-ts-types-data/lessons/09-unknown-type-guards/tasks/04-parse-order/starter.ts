export interface OrderItem {
  productId: number;
  quantity: number;
}

export interface Order {
  id: number;
  items: OrderItem[];
}

export function parseOrder(json: string): Order | null {
  // твій код тут
}
