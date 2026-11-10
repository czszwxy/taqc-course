import { component, openBugs, fixedBugs, remainingBugs, hasBlockers } from './solution';

describe('bug statistics variables', () => {
  it("component is 'Checkout'", () => {
    expect(component).toBe('Checkout');
  });

  it('openBugs is 14 and fixedBugs is 9', () => {
    expect(openBugs).toBe(14);
    expect(fixedBugs).toBe(9);
  });

  it('remainingBugs is openBugs - fixedBugs (5)', () => {
    expect(remainingBugs).toBe(5);
  }, 'Обчисли: openBugs - fixedBugs.');

  it('hasBlockers is true', () => {
    expect(hasBlockers).toBe(true);
  });
});
