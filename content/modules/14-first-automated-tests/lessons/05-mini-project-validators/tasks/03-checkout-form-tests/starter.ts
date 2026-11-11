import { canSubmit, MESSAGES, validateCheckout, type CheckoutForm } from './subject';

const validForm: CheckoutForm = { cardHolder: 'Olena Petrenko', zip: '79000', quantity: 1, promo: '' };

describe('validateCheckout', () => {
  it('reports a bad ZIP', () => {
    expect(validateCheckout({ ...validForm, zip: '7900' }).zip).toBe(MESSAGES.zip);
  });

  // твій код тут
});

void canSubmit;
