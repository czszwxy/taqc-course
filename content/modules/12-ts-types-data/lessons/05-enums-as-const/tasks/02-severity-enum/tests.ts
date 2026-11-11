import { allSeverities, isUrgent, Severity } from './solution';

describe('Severity', () => {
  it('has string values', () => {
    expect(Severity.Major).toBe('Major');
    expect(Severity.Trivial).toBe('Trivial');
  }, "Рядковий enum: Major = 'Major', а не просто Major.");
  it('isUrgent', () => {
    expect(isUrgent(Severity.Blocker)).toBe(true);
    expect(isUrgent(Severity.Critical)).toBe(true);
    expect(isUrgent(Severity.Major)).toBe(false);
    expect(isUrgent(Severity.Trivial)).toBe(false);
  });
  it('allSeverities in declaration order', () => {
    expect(allSeverities()).toEqual(['Blocker', 'Critical', 'Major', 'Minor', 'Trivial']);
  });
});
