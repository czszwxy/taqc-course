import { Wallet } from './solution';

export function compileTimeChecks(w: Wallet): void {
  // @ts-expect-error balance must be private
  w.balance = 100;
}

describe('Wallet', () => {
  it('deposit and withdraw', () => {
    const w = new Wallet();
    w.deposit(100);
    w.withdraw(30);
    expect(w.getBalance()).toBe(70);
  });
  it('rejects non-positive amounts', () => {
    const w = new Wallet();
    expect(() => w.deposit(0)).toThrow('Amount must be positive');
    expect(() => w.deposit(-5)).toThrow('Amount must be positive');
    expect(() => w.withdraw(0)).toThrow('Amount must be positive');
  });
  it('rejects withdrawing more than the balance and keeps it', () => {
    const w = new Wallet();
    w.deposit(50);
    expect(() => w.withdraw(51)).toThrow('Insufficient funds');
    expect(w.getBalance()).toBe(50);
  }, 'Перевір достатність коштів ДО зміни балансу.');
  it('can withdraw the whole balance', () => {
    const w = new Wallet();
    w.deposit(50);
    w.withdraw(50);
    expect(w.getBalance()).toBe(0);
  }, 'Межа: зняти рівно весь баланс — дозволено (amount > balance, а не >=).');
});
