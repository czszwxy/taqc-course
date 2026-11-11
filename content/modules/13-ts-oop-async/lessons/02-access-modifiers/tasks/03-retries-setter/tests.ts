import { RunConfig } from './solution';

describe('RunConfig.retries', () => {
  it('starts at 0', () => {
    expect(new RunConfig().retries).toBe(0);
  });
  it('accepts 0..5', () => {
    const cfg = new RunConfig();
    cfg.retries = 5;
    expect(cfg.retries).toBe(5);
    cfg.retries = 0;
    expect(cfg.retries).toBe(0);
  });
  it('rejects values out of range', () => {
    const cfg = new RunConfig();
    expect(() => {
      cfg.retries = 6;
    }).toThrow(RangeError);
    expect(() => {
      cfg.retries = -1;
    }).toThrow('retries must be an integer from 0 to 5');
  }, 'Межі: 0 і 5 дозволені, -1 і 6 — ні.');
  it('rejects non-integers', () => {
    const cfg = new RunConfig();
    expect(() => {
      cfg.retries = 2.5;
    }).toThrow(RangeError);
  }, 'Number.isInteger(2.5) === false.');
  it('keeps the old value after an error', () => {
    const cfg = new RunConfig();
    cfg.retries = 3;
    try {
      cfg.retries = 10;
    } catch {
      // expected
    }
    expect(cfg.retries).toBe(3);
  });
});
