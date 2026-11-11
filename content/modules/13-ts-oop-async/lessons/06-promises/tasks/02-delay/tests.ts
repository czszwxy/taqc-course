import { delay, later } from './solution';

describe('delay', () => {
  it('returns a Promise', () => {
    expect(delay(1)).toBeInstanceOf(Promise);
  }, 'Поверни new Promise(...).');
  it('waits at least ms', async () => {
    const start = Date.now();
    await delay(60);
    expect(Date.now() - start).toBeGreaterThanOrEqual(50);
  }, 'Виклич resolve у setTimeout(resolve, ms).');
  it('runs after the synchronous code', async () => {
    const order: string[] = [];
    const p = delay(0).then(() => order.push('timer'));
    order.push('sync');
    await p;
    expect(order).toEqual(['sync', 'timer']);
  });
});

describe('later', () => {
  it('resolves with the value', async () => {
    await expect(later(10, 'done')).resolves.toBe('done');
    await expect(later(10, { id: 1 })).resolves.toEqual({ id: 1 });
  });
});
