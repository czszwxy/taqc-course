import { cartTotal } from './solution';
import { LATENCY_MS } from './catalog-api';

describe('cartTotal', () => {
  it('sums prices', async () => {
    expect(await cartTotal([1, 3])).toBe(2698);
  });
  it('loads in parallel', async () => {
    const start = Date.now();
    expect(await cartTotal([1, 2, 3, 4])).toBe(4246);
    expect(Date.now() - start).toBeLessThan(LATENCY_MS * 3);
  }, 'Використай Promise.all — не чекай кожну ціну по черзі.');
  it('0 for an empty cart', async () => {
    expect(await cartTotal([])).toBe(0);
  });
});
