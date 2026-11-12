import { compareLists } from './solution';

describe('compareLists', () => {
  it('finds missing and unexpected values', () => {
    expect(compareLists(['Mouse', 'Keyboard', 'Cable'], ['Keyboard', 'Monitor', 'Mouse'])).toEqual({
      missing: ['Cable'],
      unexpected: ['Monitor'],
    });
  });

  it('returns empty lists when both match (order does not matter)', () => {
    expect(compareLists(['a', 'b', 'c'], ['c', 'a', 'b'])).toEqual({ missing: [], unexpected: [] });
  }, 'Порядок не важливий: перевіряй наявність (`Set.has`), а не позицію.');

  it('reports each value once', () => {
    expect(compareLists(['x', 'x', 'y'], ['z', 'z', 'z'])).toEqual({ missing: ['x', 'y'], unexpected: ['z'] });
  }, 'Прибери дублікати: `[...new Set(list)]`.');

  it('keeps the order of first appearance', () => {
    expect(compareLists(['c', 'a', 'b'], [])).toEqual({ missing: ['c', 'a', 'b'], unexpected: [] });
  }, 'Не сортуй результат — порядок першої появи в списку.');

  it('is case-sensitive', () => {
    expect(compareLists(['Mouse'], ['mouse'])).toEqual({ missing: ['Mouse'], unexpected: ['mouse'] });
  });

  it('handles empty lists', () => {
    expect(compareLists([], [])).toEqual({ missing: [], unexpected: [] });
    expect(compareLists([], ['a'])).toEqual({ missing: [], unexpected: ['a'] });
  });
});
