import { orderTotal } from './solution';

describe('orderTotal (async/await)', () => {
  it('multiplies price by quantity', async () => {
    expect(await orderTotal(1002)).toBe(998);
  });
  it('null for an unknown order', async () => {
    expect(await orderTotal(9999)).toBeNull();
  }, 'Огорни await-и в try/catch і в catch поверни null.');
  it('null for an unknown product', async () => {
    expect(await orderTotal(1005)).toBeNull();
  });
});
