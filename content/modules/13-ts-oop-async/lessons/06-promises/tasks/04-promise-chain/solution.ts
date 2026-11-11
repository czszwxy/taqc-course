import { getOrder, getProduct } from './shop';

export function orderTotal(orderId: number): Promise<number | null> {
  return getOrder(orderId)
    .then((order) => getProduct(order.productId).then((product) => product.price * order.quantity))
    .catch(() => null);
}
