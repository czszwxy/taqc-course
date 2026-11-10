import { getPriorityWeight } from './solution';

describe('getPriorityWeight', () => {
  it('maps high/medium/low to 3/2/1', () => {
    expect(getPriorityWeight('high')).toBe(3);
    expect(getPriorityWeight('medium')).toBe(2);
    expect(getPriorityWeight('low')).toBe(1);
  });

  it('is case-insensitive and trims spaces', () => {
    expect(getPriorityWeight(' HIGH')).toBe(3);
    expect(getPriorityWeight('Low ')).toBe(1);
  }, 'Нормалізуй рядок перед switch: trim() і toLowerCase().');

  it('returns 0 for unknown values', () => {
    expect(getPriorityWeight('asap')).toBe(0);
  }, 'Потрібна гілка default.');
});
