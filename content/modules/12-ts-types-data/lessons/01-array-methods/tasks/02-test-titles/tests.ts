import { numberTitles } from './solution';

describe('numberTitles', () => {
  it('numbers titles starting from 1', () => {
    expect(numberTitles(['login works', 'cart total'])).toEqual(['1. login works', '2. cart total']);
  }, 'Індекс у map починається з 0 — додай 1.');

  it('works for one title', () => {
    expect(numberTitles(['search'])).toEqual(['1. search']);
  });

  it('returns an empty array for no titles', () => {
    expect(numberTitles([])).toEqual([]);
  });

  it('does not change the original array', () => {
    const input = ['a', 'b'];
    numberTitles(input);
    expect(input).toEqual(['a', 'b']);
  }, 'map повертає НОВИЙ масив — не змінюй вхідний.');
});
