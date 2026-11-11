import { shippingFee } from './subject';

const rules: [number, boolean, string, number][] = [
  [2999, false, '', 100],
  [3000, false, '', 0],
  [2999, true, '', 0],
  [2999, true, 'SAVE10', 0],
  [2999, false, 'FREESHIP', 0],
  [2999, false, ' freeship ', 0],
];

describe('shippingFee', () => {
  for (const [subtotal, member, promo, fee] of rules) {
    it(`subtotal ${subtotal}, member ${member}, promo "${promo}" → ${fee}`, () => {
      expect(shippingFee(subtotal, member, promo)).toBe(fee);
    });
  }
});
