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
  const checks: [keyof CheckoutForm, string | null][] = [
    ['cardHolder', validateCardHolder(form.cardHolder)],
    ['zip', validateZip(form.zip)],
    ['quantity', validateQuantity(form.quantity)],
    ['promo', validatePromo(form.promo)],
  ];
  const errors: CheckoutErrors = {};
  for (const [field, error] of checks) {
    if (error) {
      errors[field] = error;
      return errors;
    }
  }
  return errors;
}

export function canSubmit(form: CheckoutForm): boolean {
  return Object.keys(validateCheckout(form)).length === 0;
}
