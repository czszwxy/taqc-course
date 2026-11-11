import { createOrder } from './solution';

describe('createOrder', () => {
  it('returns the new order id', async () => {
    expect(await createOrder('test-token-42', 1, 2)).toBe(1003);
  }, 'Додай заголовок Authorization: `Bearer ${token}`.');
  it('bad token → Unauthorized', async () => {
    await expect(createOrder('bad', 1, 2)).rejects.toThrow('Unauthorized');
  });
  it('invalid quantity → the API error message', async () => {
    await expect(createOrder('test-token-42', 1, 0)).rejects.toThrow('quantity must be from 1 to 10');
  });
});
