import { bugSummary, type Bug, type Issue } from './solution';

const bug: Bug = { id: 12, title: 'Total is wrong', severity: 'Major', stepsToReproduce: ['Open cart', 'Add item', 'Check total'] };
// A Bug must be usable where an Issue is expected.
const asIssue: Issue = bug;

describe('Bug interface', () => {
  it('is also an Issue', () => {
    expect(asIssue.id).toBe(12);
  }, 'Bug має розширювати Issue: interface Bug extends Issue { … }.');
});

describe('bugSummary', () => {
  it('formats a summary', () => {
    expect(bugSummary(bug)).toBe('#12 [Major] Total is wrong (3 steps)');
  });
  it('counts steps', () => {
    expect(bugSummary({ id: 7, title: 'Typo', severity: 'Trivial', stepsToReproduce: ['Open page'] })).toBe('#7 [Trivial] Typo (1 steps)');
  }, 'Кількість кроків — це довжина масиву stepsToReproduce.');
});
