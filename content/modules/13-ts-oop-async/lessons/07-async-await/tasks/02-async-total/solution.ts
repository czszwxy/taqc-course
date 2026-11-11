import { getOrder, getProduct } from './shop';

export async function orderTotal(orderId: number): Promise<number | null> {
  try {
    const order = await getOrder(orderId);
    const product = await getProduct(order.productId);
    return product.price * order.quantity;
  } catch {
    return null;
  }
}
