import { getProduct } from './solution';

describe('getProduct', () => {
  it('returns a product', async () => {
    const p = await getProduct(1);
    expect(p).toEqual({ id: 1, name: 'Wireless Mouse M2', category: 'Accessories', price: 499, inStock: true });
  });
  it('another product', async () => {
    expect((await getProduct(3)).name).toBe('Mechanical Keyboard K8');
  });
  it('throws for 404', async () => {
    await expect(getProduct(999)).rejects.toThrow('HTTP 404');
  }, 'fetch не кидає помилку на 404 — перевір response.ok сама.');
});
