import { canSubmit, MESSAGES, validateCheckout, type CheckoutForm } from './subject';

const validForm: CheckoutForm = { cardHolder: 'Olena Petrenko', zip: '79000', quantity: 1, promo: '' };

describe('validateCheckout', () => {
  it('returns no errors for a valid form (empty promo is fine)', () => {
    expect(validateCheckout(validForm)).toEqual({});
  });

  it('reports a bad ZIP only', () => {
    expect(validateCheckout({ ...validForm, zip: '7900' })).toEqual({ zip: MESSAGES.zip });
  });

  it('checks the quantity', () => {
    expect(validateCheckout({ ...validForm, quantity: 0 })).toEqual({ quantity: MESSAGES.quantity });
  });

  it('reports every invalid field at once', () => {
    expect(validateCheckout({ ...validForm, cardHolder: '', zip: 'abc', quantity: 11 })).toEqual({
      cardHolder: MESSAGES.holderRequired,
      zip: MESSAGES.zip,
      quantity: MESSAGES.quantity,
    });
  });
});

describe('canSubmit', () => {
  it('true for a valid form', () => {
    expect(canSubmit(validForm)).toBe(true);
  });

  it('false when any field is invalid', () => {
    expect(canSubmit({ ...validForm, zip: '' })).toBe(false);
    expect(canSubmit({ ...validForm, quantity: 2.5 })).toBe(false);
  });
});
