import { MESSAGES, validateCardHolder, validatePromo, validateQuantity, validateZip } from './subject';

describe('validateCardHolder', () => {
  it('accepts a normal name', () => {
    expect(validateCardHolder('Olena Petrenko')).toBeNull();
  });
});

// твій код тут: тести для меж, особливих значень і решти валідаторів
void MESSAGES;
void validatePromo;
void validateQuantity;
void validateZip;
