/** Type declarations the in-browser compiler sees for every task (console + test globals). */
export const HARNESS_DTS = `
interface Console {
  log(...data: unknown[]): void;
  info(...data: unknown[]): void;
  warn(...data: unknown[]): void;
  error(...data: unknown[]): void;
  debug(...data: unknown[]): void;
  table(data: unknown): void;
}
declare var console: Console;

interface Matchers<R = void> {
  toBe(expected: unknown): R;
  toEqual(expected: unknown): R;
  toStrictEqual(expected: unknown): R;
  toBeTruthy(): R;
  toBeFalsy(): R;
  toBeNull(): R;
  toBeUndefined(): R;
  toBeDefined(): R;
  toBeNaN(): R;
  toBeGreaterThan(n: number): R;
  toBeGreaterThanOrEqual(n: number): R;
  toBeLessThan(n: number): R;
  toBeLessThanOrEqual(n: number): R;
  toBeCloseTo(n: number, digits?: number): R;
  toContain(item: unknown): R;
  toHaveLength(n: number): R;
  toHaveProperty(key: string, value?: unknown): R;
  toMatch(pattern: RegExp | string): R;
  toBeInstanceOf(ctor: Function): R;
  toBeTypeOf(type: 'string' | 'number' | 'boolean' | 'object' | 'function' | 'undefined' | 'bigint' | 'symbol'): R;
  toThrow(expected?: string | RegExp): R;
}
interface Expectation extends Matchers {
  not: Matchers;
  resolves: Matchers<Promise<void>>;
  rejects: Matchers<Promise<void>>;
}
declare function expect(actual: unknown, message?: string): Expectation;
declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void | Promise<void>, hintOnFail?: string): void;
declare function test(name: string, fn: () => void | Promise<void>, hintOnFail?: string): void;
/** Runs fn and returns every line it printed with console.log (nothing reaches the Console panel). */
declare function captureConsole(fn: () => void): string[];
`;
