import { orderTotal } from './solution';

describe('orderTotal', () => {
  it('multiplies price by quantity', async () => {
    await expect(orderTotal(1002)).resolves.toBe(998);
  });
  it('null when the order does not exist', async () => {
    await expect(orderTotal(9999)).resolves.toBeNull();
  }, 'Додай .catch(() => null) в кінці ланцюжка.');
  it('null when the product does not exist', async () => {
    await expect(orderTotal(1005)).resolves.toBeNull();
  }, 'Помилка другого кроку теж має потрапити в catch — повертай Promise з then, а не викликай getProduct «у повітря».');
});
