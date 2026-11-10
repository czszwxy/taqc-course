import { buildUrl } from './solution';

describe('buildUrl', () => {
  it('uses the default base URL', () => {
    expect(buildUrl('/login')).toBe('https://staging.example.com/login');
  }, "Значення за замовчуванням: baseUrl: string = 'https://staging.example.com'.");

  it('adds a slash when the path has none', () => {
    expect(buildUrl('login')).toBe('https://staging.example.com/login');
  });

  it('accepts a custom base URL with a trailing slash', () => {
    expect(buildUrl('cart', 'http://localhost:3000/')).toBe('http://localhost:3000/cart');
  }, 'Прибери слеш у кінці baseUrl, інакше вийде "//".');

  it('never produces a double slash', () => {
    expect(buildUrl('/checkout', 'http://app.test/')).toBe('http://app.test/checkout');
  });

  it('keeps nested paths', () => {
    expect(buildUrl('/a/b', 'http://app.test')).toBe('http://app.test/a/b');
  });
});
