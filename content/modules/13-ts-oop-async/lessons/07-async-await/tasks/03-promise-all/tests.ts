import { loadUsers } from './solution';
import { LATENCY_MS } from './users-api';

describe('loadUsers', () => {
  it('keeps the order of ids', async () => {
    const users = await loadUsers([2, 1]);
    expect(users.map((u) => u.name)).toEqual(['Taras', 'Olena']);
  });
  it('loads in parallel', async () => {
    const start = Date.now();
    const users = await loadUsers([1, 2, 3, 4, 5]);
    expect(users).toHaveLength(5);
    expect(Date.now() - start).toBeLessThan(LATENCY_MS * 3);
  }, 'Запити йдуть по черзі. Запусти всі одразу: Promise.all(ids.map(...)).');
  it('rejects when a user is missing', async () => {
    await expect(loadUsers([1, 99])).rejects.toThrow('User 99 not found');
  });
  it('[] for no ids', async () => {
    expect(await loadUsers([])).toEqual([]);
  });
});
