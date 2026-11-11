import { runStep } from './solution';

describe('runStep', () => {
  it('logs a passing step', () => {
    const log: string[] = [];
    expect(runStep('open page', () => {}, log)).toBe(true);
    expect(log).toEqual(['start open page', 'pass open page', 'end open page']);
  });
  it('logs a failing step', () => {
    const log: string[] = [];
    expect(runStep('click pay', () => {
      throw new Error('button not found');
    }, log)).toBe(false);
    expect(log).toEqual(['start click pay', 'fail click pay: button not found', 'end click pay']);
  }, 'end <name> має з\'явитися і після помилки — це робота finally.');
  it('handles non-Error throws', () => {
    const log: string[] = [];
    runStep('weird', () => {
      throw 'oops';
    }, log);
    expect(log[1]).toBe('fail weird: oops');
  }, 'Кинути можна будь-що. Для не-Error використай String(error).');
});
