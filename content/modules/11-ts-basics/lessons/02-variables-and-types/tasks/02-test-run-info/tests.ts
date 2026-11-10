import { projectName, totalTests, passedTests, failedTests, isReleaseBlocked } from './solution';

describe('test run variables', () => {
  it("projectName is 'QA Academy'", () => {
    expect(projectName).toBe('QA Academy');
  });

  it('totalTests is 120 and passedTests is 117', () => {
    expect(totalTests).toBe(120);
    expect(passedTests).toBe(117);
  }, 'Числа пишуться без лапок.');

  it('failedTests equals totalTests - passedTests (3)', () => {
    expect(failedTests).toBe(3);
  }, 'Обчисли: totalTests - passedTests.');

  it('isReleaseBlocked is false', () => {
    expect(isReleaseBlocked).toBe(false);
  }, 'Логічне значення false пишеться без лапок.');
});
