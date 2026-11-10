import { normalizeEmail } from './solution';

describe('normalizeEmail', () => {
  it('lower-cases the email', () => {
    expect(normalizeEmail('QA@Example.COM')).toBe('qa@example.com');
  }, 'Використай toLowerCase().');

  it('trims spaces around', () => {
    expect(normalizeEmail('   user@test.io  ')).toBe('user@test.io');
  }, 'Використай trim().');

  it('does both at once', () => {
    expect(normalizeEmail('  QA.Engineer@Example.COM ')).toBe('qa.engineer@example.com');
  });

  it('leaves an already normalized email unchanged', () => {
    expect(normalizeEmail('ok@mail.com')).toBe('ok@mail.com');
  });
});
