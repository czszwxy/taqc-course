/**
 * Tiny Jest/Vitest-like test harness + CommonJS module loader.
 * Pure: used inside the exec Web Worker (browser) and by scripts/validate-content.ts (Node).
 */
import { createFakeFetch } from './fake-fetch';

export interface LogEntry {
  level: 'log' | 'info' | 'warn' | 'error';
  text: string;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  /** Human explanation from the task author, shown when this test fails. */
  hint?: string;
}

export interface ExecOutput {
  results: TestResult[];
  logs: LogEntry[];
  runtimeError?: string;
  timedOut?: boolean;
}

export interface ExecRequest {
  /** Compiled JS modules keyed by path, e.g. "/solution.js". */
  modules: Record<string, string>;
  entry: string;
  collectTests: boolean;
  testTimeoutMs?: number;
}

class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

const MAX_LOGS = 300;

type MatcherFn = (...args: unknown[]) => void;

export async function executeModules(req: ExecRequest): Promise<ExecOutput> {
  const logs: LogEntry[] = [];
  let sink: string[] | null = null;

  const push =
    (level: LogEntry['level']) =>
    (...args: unknown[]) => {
      const text = args.map((a) => (typeof a === 'string' ? a : format(a))).join(' ');
      if (sink) {
        sink.push(text);
        return;
      }
      if (logs.length < MAX_LOGS) logs.push({ level, text });
      else if (logs.length === MAX_LOGS) logs.push({ level: 'warn', text: '… more output truncated' });
    };

  const fakeConsole = {
    log: push('log'),
    info: push('info'),
    debug: push('log'),
    warn: push('warn'),
    error: push('error'),
    table: push('log'),
  };

  const captureConsole = (fn: () => void): string[] => {
    const prev = sink;
    const lines: string[] = [];
    sink = lines;
    try {
      fn();
    } finally {
      sink = prev;
    }
    return lines;
  };

  const captureConsoleAsync = async (fn: () => unknown): Promise<string[]> => {
    const prev = sink;
    const lines: string[] = [];
    sink = lines;
    try {
      await fn();
    } finally {
      sink = prev;
    }
    return lines;
  };

  const fakeFetch = createFakeFetch();

  type HookFn = () => unknown;
  type HookKind = 'beforeEach' | 'afterEach' | 'beforeAll' | 'afterAll';
  interface Scope extends Record<HookKind, HookFn[]> {
    parent: Scope | null;
  }
  const newScope = (parent: Scope | null): Scope => ({ parent, beforeEach: [], afterEach: [], beforeAll: [], afterAll: [] });
  const rootScope = newScope(null);
  let currentScope = rootScope;

  interface RegisteredTest {
    name: string;
    fn: () => unknown;
    hint?: string;
    scope: Scope;
  }
  const tests: RegisteredTest[] = [];
  const prefix: string[] = [];
  const describe = (name: string, fn: () => void) => {
    prefix.push(name);
    const parent = currentScope;
    currentScope = newScope(parent);
    try {
      fn();
    } finally {
      prefix.pop();
      currentScope = parent;
    }
  };
  const it = (name: string, fn: () => unknown, hint?: string) => {
    tests.push({ name: [...prefix, name].join(' › '), fn, hint, scope: currentScope });
  };
  const hook = (kind: HookKind) => (fn: HookFn) => {
    currentScope[kind].push(fn);
  };

  const resolve = (name: string) =>
    name.startsWith('./') ? '/' + name.slice(2).replace(/\.(ts|js)$/, '') + '.js' : name;

  const cache: Record<string, { exports: Record<string, unknown> }> = {};
  const load = (file: string): unknown => {
    const cached = cache[file];
    if (cached) return cached.exports;
    const code = req.modules[file];
    if (code === undefined) {
      throw new Error(`Cannot find module '${file.replace(/^\//, './').replace(/\.js$/, '')}'`);
    }
    const module = { exports: {} as Record<string, unknown> };
    cache[file] = module;
    const fn = new Function(
      'exports',
      'require',
      'module',
      'console',
      'describe',
      'it',
      'test',
      'expect',
      'captureConsole',
      'captureConsoleAsync',
      'beforeEach',
      'afterEach',
      'beforeAll',
      'afterAll',
      'fetch',
      code,
    );
    fn(
      module.exports,
      (name: string) => load(resolve(name)),
      module,
      fakeConsole,
      describe,
      it,
      it,
      expect,
      captureConsole,
      captureConsoleAsync,
      hook('beforeEach'),
      hook('afterEach'),
      hook('beforeAll'),
      hook('afterAll'),
      fakeFetch,
    );
    return module.exports;
  };

  try {
    load(req.entry);
  } catch (e) {
    return { results: [], logs, runtimeError: describeError(e) };
  }

  const results: TestResult[] = [];
  if (req.collectTests) {
    const runFn = async (fn: () => unknown) => {
      const r = fn();
      if (r && typeof (r as Promise<unknown>).then === 'function') {
        await withTimeout(r as Promise<unknown>, req.testTimeoutMs ?? 2000);
      }
    };
    const chain = (scope: Scope): Scope[] => (scope.parent ? [...chain(scope.parent), scope] : [scope]);
    const lastTestOf = new Map<Scope, number>();
    tests.forEach((t, i) => chain(t.scope).forEach((sc) => lastTestOf.set(sc, i)));
    const started = new Set<Scope>();

    for (const [i, t] of tests.entries()) {
      const scopes = chain(t.scope);
      let error: unknown = undefined;
      let failed = false;
      const note = (e: unknown, where: string) => {
        if (failed) return;
        failed = true;
        error = where ? new AssertionError(where + ' failed: ' + describeError(e)) : e;
      };
      try {
        for (const sc of scopes) {
          if (started.has(sc)) continue;
          started.add(sc);
          for (const h of sc.beforeAll) await runFn(h);
        }
      } catch (e) {
        note(e, 'beforeAll hook');
      }
      if (!failed) {
        try {
          for (const sc of scopes) for (const h of sc.beforeEach) await runFn(h);
        } catch (e) {
          note(e, 'beforeEach hook');
        }
      }
      if (!failed) {
        try {
          await runFn(t.fn);
        } catch (e) {
          note(e, '');
        }
      }
      try {
        for (const sc of [...scopes].reverse()) for (const h of sc.afterEach) await runFn(h);
      } catch (e) {
        note(e, 'afterEach hook');
      }
      try {
        for (const sc of [...scopes].reverse()) {
          if (lastTestOf.get(sc) === i) for (const h of sc.afterAll) await runFn(h);
        }
      } catch (e) {
        note(e, 'afterAll hook');
      }
      results.push(failed ? { name: t.name, passed: false, error: describeError(error), hint: t.hint } : { name: t.name, passed: true });
    }
  }
  return { results, logs };
}

export function expect(actual: unknown, message?: string) {
  const build = (negate: boolean): Record<string, MatcherFn> => {
    const not = negate ? 'not ' : '';
    const check = (pass: boolean, explain: () => string) => {
      if (pass === negate) throw new AssertionError((message ? message + '\n' : '') + explain());
    };
    const expRec = (exp: unknown) =>
      negate ? `Expected a value different from ${format(exp)}` : `Expected: ${format(exp)}\nReceived: ${format(actual)}`;

    return {
      toBe: (exp) => check(Object.is(actual, exp), () => expRec(exp)),
      toEqual: (exp) => check(deepEqual(actual, exp), () => expRec(exp)),
      toStrictEqual: (exp) => check(deepEqual(actual, exp), () => expRec(exp)),
      toBeTruthy: () => check(Boolean(actual), () => `Expected ${format(actual)} ${not}to be truthy`),
      toBeFalsy: () => check(!actual, () => `Expected ${format(actual)} ${not}to be falsy`),
      toBeNull: () => check(actual === null, () => `Expected ${not}null, received ${format(actual)}`),
      toBeUndefined: () => check(actual === undefined, () => `Expected ${not}undefined, received ${format(actual)}`),
      toBeDefined: () => check(actual !== undefined, () => `Expected value ${not}to be defined`),
      toBeNaN: () => check(Number.isNaN(actual), () => `Expected ${format(actual)} ${not}to be NaN`),
      toBeGreaterThan: (n) =>
        check(num(actual) > num(n), () => `Expected ${format(actual)} ${not}to be greater than ${format(n)}`),
      toBeGreaterThanOrEqual: (n) =>
        check(num(actual) >= num(n), () => `Expected ${format(actual)} ${not}to be >= ${format(n)}`),
      toBeLessThan: (n) => check(num(actual) < num(n), () => `Expected ${format(actual)} ${not}to be less than ${format(n)}`),
      toBeLessThanOrEqual: (n) => check(num(actual) <= num(n), () => `Expected ${format(actual)} ${not}to be <= ${format(n)}`),
      toBeCloseTo: (n, digits = 2) =>
        check(
          Math.abs(num(actual) - num(n)) < 10 ** -num(digits) / 2,
          () => `Expected ${format(actual)} ${not}to be close to ${format(n)}`,
        ),
      toContain: (item) =>
        check(
          typeof actual === 'string' ? actual.includes(String(item)) : Array.isArray(actual) ? actual.includes(item) : false,
          () => `Expected ${format(actual)} ${not}to contain ${format(item)}`,
        ),
      toHaveLength: (n) => {
        const len = actual == null ? undefined : (actual as { length?: unknown }).length;
        check(len === n, () => `Expected length ${not}${format(n)}, received length ${format(len)}\nValue: ${format(actual)}`);
      },
      toHaveProperty: (key, ...rest) => {
        const k = String(key);
        const has = actual != null && Object.prototype.hasOwnProperty.call(actual, k);
        const valueOk = rest.length === 0 || (has && deepEqual((actual as Record<string, unknown>)[k], rest[0]));
        check(
          has && valueOk,
          () =>
            rest.length === 0
              ? `Expected object ${not}to have property "${k}"\nReceived: ${format(actual)}`
              : `Expected property "${k}" ${not}to equal ${format(rest[0])}\nReceived: ${format(actual)}`,
        );
      },
      toMatch: (p) => {
        const s = typeof actual === 'string' ? actual : '';
        const ok = typeof actual === 'string' && (p instanceof RegExp ? p.test(s) : s.includes(String(p)));
        check(ok, () => `Expected ${format(actual)} ${not}to match ${p instanceof RegExp ? String(p) : format(p)}`);
      },
      toBeInstanceOf: (C) =>
        check(
          typeof C === 'function' && actual instanceof (C as new (...a: never[]) => unknown),
          () => `Expected value ${not}to be an instance of ${(C as { name?: string })?.name ?? 'the given class'}\nReceived: ${format(actual)}`,
        ),
      toBeTypeOf: (t) => check(typeof actual === t, () => `Expected type ${not}${format(t)}, received ${format(typeof actual)}`),
      toThrow: (expected) => {
        let thrown: unknown;
        let didThrow = false;
        if (typeof actual === 'function') {
          try {
            (actual as () => unknown)();
          } catch (e) {
            didThrow = true;
            thrown = e;
          }
        } else if (actual instanceof Error) {
          didThrow = true;
          thrown = actual;
        }
        const msg = thrown instanceof Error ? thrown.message : String(thrown);
        let ok = didThrow;
        if (ok && expected !== undefined) {
          if (typeof expected === 'function') ok = thrown instanceof (expected as new (...a: never[]) => unknown);
          else ok = expected instanceof RegExp ? expected.test(msg) : msg.includes(String(expected));
        }
        check(ok, () =>
          negate
            ? `Expected function not to throw, but it threw: ${msg}`
            : didThrow
              ? typeof expected === 'function'
                ? `Expected an error of type ${(expected as { name?: string }).name ?? 'the given class'}, received ${format(thrown)}`
                : `Expected error message to match ${format(expected)}, received ${format(msg)}`
              : 'Expected function to throw an error, but it did not',
        );
      },
    };
  };

  const asyncChain = (kind: 'resolves' | 'rejects') =>
    new Proxy(
      {},
      {
        get:
          (_target, prop) =>
          async (...args: unknown[]) => {
            let value: unknown;
            if (kind === 'resolves') {
              value = await actual;
            } else {
              let rejected = false;
              try {
                await actual;
              } catch (e) {
                rejected = true;
                value = e;
              }
              if (!rejected) {
                throw new AssertionError((message ? message + '\n' : '') + 'Expected promise to reject, but it resolved');
              }
            }
            const matchers = expect(value, message) as unknown as Record<string, MatcherFn>;
            matchers[String(prop)](...args);
          },
      },
    );

  return Object.assign(build(false), { not: build(true), resolves: asyncChain('resolves'), rejects: asyncChain('rejects') });
}

function num(x: unknown): number {
  return typeof x === 'number' ? x : Number(x);
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new AssertionError(`Test timed out after ${ms} ms (a Promise never settled?)`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function describeError(e: unknown): string {
  if (e instanceof AssertionError) return e.message;
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return `Thrown value: ${format(e)}`;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  if (a instanceof Map || b instanceof Map) {
    if (!(a instanceof Map && b instanceof Map) || a.size !== b.size) return false;
    for (const [k, v] of a) if (!b.has(k) || !deepEqual(v, b.get(k))) return false;
    return true;
  }
  if (a instanceof Set || b instanceof Set) {
    if (!(a instanceof Set && b instanceof Set) || a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }
  const ra = a as Record<string, unknown>;
  const rb = b as Record<string, unknown>;
  const ka = Object.keys(ra).filter((k) => ra[k] !== undefined);
  const kb = Object.keys(rb).filter((k) => rb[k] !== undefined);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.prototype.hasOwnProperty.call(rb, k) && deepEqual(ra[k], rb[k]));
}

/** Formats a value for messages: strings are quoted so "5" and 5 look different. */
export function format(v: unknown, depth = 0): string {
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'bigint') return `${v}n`;
  if (v === undefined) return 'undefined';
  if (v === null || typeof v === 'number' || typeof v === 'boolean') return Object.is(v, -0) ? '-0' : String(v);
  if (typeof v === 'function') return `[Function ${v.name || 'anonymous'}]`;
  if (typeof v === 'symbol') return v.toString();
  if (depth > 3) return '…';
  if (Array.isArray(v)) return `[${v.map((x) => format(x, depth + 1)).join(', ')}]`;
  if (v instanceof Error) return `${v.name}: ${v.message}`;
  if (v instanceof Date) return `Date(${isNaN(v.getTime()) ? 'Invalid' : v.toISOString()})`;
  if (v instanceof Map) {
    return `Map { ${[...v].map(([k, x]) => `${format(k, depth + 1)} => ${format(x, depth + 1)}`).join(', ')} }`;
  }
  if (v instanceof Set) return `Set { ${[...v].map((x) => format(x, depth + 1)).join(', ')} }`;
  const entries = Object.entries(v as Record<string, unknown>);
  if (entries.length === 0) return '{}';
  return `{ ${entries.map(([k, x]) => `${k}: ${format(x, depth + 1)}`).join(', ')} }`;
}
