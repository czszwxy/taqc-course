export interface CartItem {
  name: string;
  price: number;
  quantity: number;
}

export class Cart {
  items: CartItem[] = [];

  add(name: string, price: number, quantity = 1): void {
    const existing = this.items.find((i) => i.name === name);
    if (existing) existing.quantity += quantity;
    else this.items.push({ name, price, quantity });
  }

  count(): number {
    return this.items.reduce((sum, i) => sum + i.quantity, 0);
  }

  total(): number {
    return this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }
}
