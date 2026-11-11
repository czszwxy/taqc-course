import { Priority, sortByPriority, type PrioritizedCase } from './solution';

const cases: PrioritizedCase[] = [
  { title: 'Search', priority: Priority.Low },
  { title: 'Login', priority: Priority.High },
  { title: 'Cart', priority: Priority.Medium },
  { title: 'Logout', priority: Priority.High },
];

describe('sortByPriority', () => {
  it('sorts High → Medium → Low', () => {
    expect(sortByPriority(cases).map((c) => c.title)).toEqual(['Login', 'Logout', 'Cart', 'Search']);
  }, 'Порівнюй не назви пріоритетів (алфавіт), а їхні ранги: High = 0, Medium = 1, Low = 2.');
  it('keeps the original order inside one priority', () => {
    const same: PrioritizedCase[] = [
      { title: 'B', priority: Priority.Medium },
      { title: 'A', priority: Priority.Medium },
    ];
    expect(sortByPriority(same).map((c) => c.title)).toEqual(['B', 'A']);
  });
  it('does not change the original array', () => {
    sortByPriority(cases);
    expect(cases[0]?.title).toBe('Search');
  }, 'Сортуй копію: [...cases].sort(...).');
});
