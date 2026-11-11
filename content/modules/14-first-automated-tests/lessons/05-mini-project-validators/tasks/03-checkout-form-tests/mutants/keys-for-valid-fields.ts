import { validateCardHolder, validatePromo, validateQuantity, validateZip } from './validators';

export { MESSAGES } from './validators';

export interface CheckoutForm {
  cardHolder: string;
  zip: string;
  quantity: number;
  promo: string;
}

export type CheckoutErrors = Partial<Record<keyof CheckoutForm, string>>;

export function validateCheckout(form: CheckoutForm): CheckoutErrors {
  const errors = {
    cardHolder: validateCardHolder(form.cardHolder),
    zip: validateZip(form.zip),
    quantity: validateQuantity(form.quantity),
    promo: validatePromo(form.promo),
  };
  return errors as unknown as CheckoutErrors;
}

export function canSubmit(form: CheckoutForm): boolean {
  return Object.values(validateCheckout(form)).every((e) => e === null);
}
