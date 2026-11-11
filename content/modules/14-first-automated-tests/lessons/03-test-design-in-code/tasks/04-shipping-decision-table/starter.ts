import { shippingFee } from './subject';

describe('shippingFee', () => {
  it('charges 100 when no condition is met', () => {
    expect(shippingFee(1000, false, '')).toBe(100);
  });

  // твій код тут: правила таблиці рішень
});
