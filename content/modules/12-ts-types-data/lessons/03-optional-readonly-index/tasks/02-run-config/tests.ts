import { resolveConfig } from './solution';

describe('resolveConfig', () => {
  it('fills in all defaults', () => {
    expect(resolveConfig({ baseUrl: 'http://localhost:5173' })).toEqual({
      baseUrl: 'http://localhost:5173',
      retries: 0,
      headless: true,
      timeoutMs: 30000,
    });
  });

  it('keeps explicit values', () => {
    expect(resolveConfig({ baseUrl: 'x', retries: 2, headless: true, timeoutMs: 5000 })).toEqual({
      baseUrl: 'x',
      retries: 2,
      headless: true,
      timeoutMs: 5000,
    });
  });

  it('keeps explicit false and 0', () => {
    expect(resolveConfig({ baseUrl: 'x', headless: false, timeoutMs: 0 })).toEqual({
      baseUrl: 'x',
      retries: 0,
      headless: false,
      timeoutMs: 0,
    });
  }, 'false і 0 — це задані значення. Оператор ?? їх не замінює, а || — замінює.');
});
