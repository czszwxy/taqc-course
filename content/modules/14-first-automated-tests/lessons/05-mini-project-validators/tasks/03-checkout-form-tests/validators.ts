export const HOLDER_MIN = 2;
export const HOLDER_MAX = 40;
export const QTY_MIN = 1;
export const QTY_MAX = 10;

export const MESSAGES = {
  holderRequired: 'Card holder is required',
  holderLength: 'Card holder must be 2–40 characters',
  holderChars: 'Card holder may contain only letters, spaces, hyphens and apostrophes',
  zip: 'ZIP code must be exactly 5 digits',
  quantity: 'Quantity must be a whole number from 1 to 10',
  promo: 'Promo code must be 4–10 letters or digits',
};

export function validateCardHolder(name: string): string | null {
  const value = name.trim();
  if (!value) return MESSAGES.holderRequired;
  if (value.length < HOLDER_MIN || value.length > HOLDER_MAX) return MESSAGES.holderLength;
  if (!/^[\p{L} '-]+$/u.test(value)) return MESSAGES.holderChars;
  return null;
}

export function validateZip(zip: string): string | null {
  return /^\d{5}$/.test(zip.trim()) ? null : MESSAGES.zip;
}

export function validateQuantity(quantity: number): string | null {
  return Number.isInteger(quantity) && quantity >= QTY_MIN && quantity <= QTY_MAX ? null : MESSAGES.quantity;
}

export function validatePromo(code: string): string | null {
  const value = code.trim();
  if (!value) return null;
  return /^[A-Z0-9]{4,10}$/i.test(value) ? null : MESSAGES.promo;
}
