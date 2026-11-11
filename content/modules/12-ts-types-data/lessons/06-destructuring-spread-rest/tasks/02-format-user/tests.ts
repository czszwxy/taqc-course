import { formatUser } from './solution';

describe('formatUser', () => {
  it('uses the given role', () => {
    expect(formatUser({ name: 'Olena', email: 'qa@gadgetly.test', role: 'admin' })).toBe('Olena <qa@gadgetly.test> (admin)');
  });
  it('defaults role to customer', () => {
    expect(formatUser({ name: 'Taras', email: 'taras@gadgetly.test' })).toBe('Taras <taras@gadgetly.test> (customer)');
  }, "Дай значення за замовчуванням прямо в деструктуризації: role = 'customer'.");
});
