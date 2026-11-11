import { storyLine, type Issue, type Story } from './solution';

const story: Story = { id: 5, title: 'Pay with PayPal', points: 8, acceptanceCriteria: ['Button shown', 'Redirect works'] };
const asIssue: Issue = story;

describe('storyLine', () => {
  it('Story is an Issue', () => {
    expect(asIssue.title).toBe('Pay with PayPal');
  });
  it('formats a story line', () => {
    expect(storyLine(story)).toBe('US-5: Pay with PayPal — 8 pts, 2 AC');
  });
});
