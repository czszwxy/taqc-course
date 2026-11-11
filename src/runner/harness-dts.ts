/**
 * Test globals (describe / it / expect / captureConsole). Also added to Monaco as an extra lib,
 * so learners who write tests get autocomplete and no red squiggles.
 */
export const TEST_GLOBALS_DTS = `
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
  toThrow(expected?: string | RegExp | Function): R;
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
declare function beforeEach(fn: () => void | Promise<void>): void;
declare function afterEach(fn: () => void | Promise<void>): void;
declare function beforeAll(fn: () => void | Promise<void>): void;
declare function afterAll(fn: () => void | Promise<void>): void;
/** Runs fn and returns every line it printed with console.log (nothing reaches the Console panel). */
declare function captureConsole(fn: () => void): string[];
/** Like captureConsole, but waits for an async function (Promises, timers) to finish. */
declare function captureConsoleAsync(fn: () => void | Promise<void>): Promise<string[]>;
`;

/**
 * Runtime globals that exist in browsers and Node but not in the ES2022 lib the task compiler uses:
 * console, timers and a fake offline fetch (see fake-fetch.ts).
 */
export const RUNTIME_DTS = `
interface Console {
  log(...data: unknown[]): void;
  info(...data: unknown[]): void;
  warn(...data: unknown[]): void;
  error(...data: unknown[]): void;
  debug(...data: unknown[]): void;
  table(data: unknown): void;
}
declare var console: Console;

declare function setTimeout(handler: () => void, timeout?: number): number;
declare function clearTimeout(id?: number): void;
declare function setInterval(handler: () => void, timeout?: number): number;
declare function clearInterval(id?: number): void;
declare function queueMicrotask(callback: () => void): void;

interface Headers {
  get(name: string): string | null;
}
interface Response {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly url: string;
  readonly headers: Headers;
  json(): Promise<any>;
  text(): Promise<string>;
}
interface RequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}
/** Offline fake of the browser fetch: talks to the in-memory Gadgetly API at https://api.gadgetly.test */
declare function fetch(url: string, init?: RequestInit): Promise<Response>;
`;

/** Everything the task compiler sees. */
export const HARNESS_DTS = RUNTIME_DTS + TEST_GLOBALS_DTS;
