import { validateCardHolder, validatePromo, validateZip } from './validators';

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
    ['promo', validatePromo(form.promo)],
  ];
  const errors: CheckoutErrors = {};
  for (const [field, error] of checks) {
    if (error) errors[field] = error;
  }
  return errors;
}

export function canSubmit(form: CheckoutForm): boolean {
  return Object.keys(validateCheckout(form)).length === 0;
}
