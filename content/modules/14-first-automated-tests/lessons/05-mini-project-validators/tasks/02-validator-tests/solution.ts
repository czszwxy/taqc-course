import { MESSAGES, validateCardHolder, validatePromo, validateQuantity, validateZip } from './subject';

const holderCases: [string, string | null][] = [
  ['Olena Petrenko', null],
  ["O'Neil", null],
  ['Anna-Maria', null],
  ['Олена', null],
  ['Al', null],
  ['A'.repeat(40), null],
  ['', MESSAGES.holderRequired],
  ['   ', MESSAGES.holderRequired],
  ['A', MESSAGES.holderLength],
  ['A'.repeat(41), MESSAGES.holderLength],
  ['Olena 2', MESSAGES.holderChars],
];

const zipCases: [string, string | null][] = [
  ['79000', null],
  [' 79000 ', null],
  ['7900', MESSAGES.zip],
  ['790001', MESSAGES.zip],
  ['79A00', MESSAGES.zip],
];

const quantityCases: [number, string | null][] = [
  [1, null],
  [10, null],
  [0, MESSAGES.quantity],
  [11, MESSAGES.quantity],
  [2.5, MESSAGES.quantity],
];

const promoCases: [string, string | null][] = [
  ['', null],
  ['SAVE10', null],
  ['save10', null],
  ['ABCD', null],
  ['ABC', MESSAGES.promo],
  ['A'.repeat(11), MESSAGES.promo],
  ['SAVE-10', MESSAGES.promo],
];

describe('validateCardHolder', () => {
  for (const [value, expected] of holderCases) {
    it(`"${value}" → ${expected ?? 'valid'}`, () => expect(validateCardHolder(value)).toBe(expected));
  }
});

describe('validateZip', () => {
  for (const [value, expected] of zipCases) {
    it(`"${value}" → ${expected ?? 'valid'}`, () => expect(validateZip(value)).toBe(expected));
  }
});

describe('validateQuantity', () => {
  for (const [value, expected] of quantityCases) {
    it(`${value} → ${expected ?? 'valid'}`, () => expect(validateQuantity(value)).toBe(expected));
  }
});

describe('validatePromo', () => {
  for (const [value, expected] of promoCases) {
    it(`"${value}" → ${expected ?? 'valid'}`, () => expect(validatePromo(value)).toBe(expected));
  }
});
