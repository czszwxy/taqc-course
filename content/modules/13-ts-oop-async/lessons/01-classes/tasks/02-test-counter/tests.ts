import { TestCounter } from './solution';

describe('TestCounter', () => {
  it('starts at zero', () => {
    const c = new TestCounter();
    expect(c.passed).toBe(0);
    expect(c.failed).toBe(0);
    expect(c.total()).toBe(0);
  });
  it('records results', () => {
    const c = new TestCounter();
    c.record('passed');
    c.record('passed');
    c.record('failed');
    expect(c.passed).toBe(2);
    expect(c.failed).toBe(1);
    expect(c.total()).toBe(3);
  });
  it('calculates the pass rate', () => {
    const c = new TestCounter();
    c.record('passed');
    c.record('passed');
    c.record('failed');
    expect(c.passRate()).toBe(67);
  }, 'Math.round((passed / total) * 100).');
  it('pass rate is 0 with no tests', () => {
    expect(new TestCounter().passRate()).toBe(0);
  }, 'Ділення 0 / 0 дає NaN — перевір total() === 0 окремо.');
  it('instances are independent', () => {
    const a = new TestCounter();
    const b = new TestCounter();
    a.record('failed');
    expect(b.failed).toBe(0);
  });
});
