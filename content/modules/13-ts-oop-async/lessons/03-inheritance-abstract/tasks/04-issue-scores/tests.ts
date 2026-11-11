import { Bug, Issue, Story, topIssue } from './solution';

describe('Bug and Story', () => {
  it('bug scores by severity', () => {
    expect(new Bug('a', 'Critical').score()).toBe(30);
    expect(new Bug('a', 'Major').score()).toBe(20);
    expect(new Bug('a', 'Minor').score()).toBe(10);
  });
  it('story scores by points', () => {
    expect(new Story('a', 13).score()).toBe(13);
  });
  it('both are Issues', () => {
    expect(new Bug('a', 'Minor')).toBeInstanceOf(Issue);
    expect(new Story('a', 1)).toBeInstanceOf(Issue);
  });
});

describe('topIssue', () => {
  it('finds the highest score', () => {
    expect(topIssue([new Story('PayPal', 13), new Bug('Total is wrong', 'Major'), new Bug('Crash', 'Critical')])).toBe('Crash');
    expect(topIssue([new Story('Big story', 40), new Bug('Crash', 'Critical')])).toBe('Big story');
  });
  it('keeps the first on a tie', () => {
    expect(topIssue([new Story('A', 20), new Bug('B', 'Major')])).toBe('A');
  }, 'При рівних балах залишай першу задачу: порівнюй через >, не >=.');
  it('null for no issues', () => {
    expect(topIssue([])).toBeNull();
  });
});
