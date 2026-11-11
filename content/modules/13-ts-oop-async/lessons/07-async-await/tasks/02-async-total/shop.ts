const ORDERS: Record<number, { productId: number; quantity: number }> = {
  1002: { productId: 1, quantity: 2 },
  1005: { productId: 99, quantity: 1 },
};

const PRODUCTS: Record<number, { name: string; price: number }> = {
  1: { name: 'Wireless Mouse M2', price: 499 },
  3: { name: 'Mechanical Keyboard K8', price: 2199 },
};

const LATENCY_MS = 5;

export function getOrder(id: number): Promise<{ productId: number; quantity: number }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const order = ORDERS[id];
      if (order) resolve(order);
      else reject(new Error(`Order ${id} not found`));
    }, LATENCY_MS);
  });
}

export function getProduct(id: number): Promise<{ name: string; price: number }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const product = PRODUCTS[id];
      if (product) resolve(product);
      else reject(new Error(`Product ${id} not found`));
    }, LATENCY_MS);
  });
}
