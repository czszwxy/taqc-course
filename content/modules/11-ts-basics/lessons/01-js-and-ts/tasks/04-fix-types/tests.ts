import { suiteName, totalTests, isSmoke } from './solution';

describe('test suite config', () => {
  it("suiteName is the string 'Login suite'", () => {
    expect(suiteName).toBe('Login suite');
  }, 'Значення має бути текстом у лапках: \'Login suite\'.');

  it('totalTests is the number 25', () => {
    expect(totalTests).toBe(25);
  }, "Число пишеться без лапок: 25, а не '25'.");

  it('isSmoke is the boolean true', () => {
    expect(isSmoke).toBe(true);
  }, "Логічне значення пишеться без лапок: true, а не 'true'.");
});
