import { UserFactory } from './solution';

describe('UserFactory', () => {
  it('creates users with unique ids and emails', () => {
    UserFactory.reset();
    expect(UserFactory.create('admin')).toEqual({ id: 1, email: 'admin1@gadgetly.test', role: 'admin' });
    expect(UserFactory.create('customer')).toEqual({ id: 2, email: 'customer2@gadgetly.test', role: 'customer' });
  }, 'Після кожного create збільшуй UserFactory.nextId.');
  it('reset starts from 1 again', () => {
    UserFactory.create('x');
    UserFactory.reset();
    expect(UserFactory.create('guest').id).toBe(1);
  });
  it('nextId is static', () => {
    UserFactory.reset();
    expect(UserFactory.nextId).toBe(1);
  });
});
