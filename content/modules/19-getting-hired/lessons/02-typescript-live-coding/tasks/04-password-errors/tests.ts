import { passwordErrors } from './solution';

describe('passwordErrors', () => {
  it('accepts a valid password', () => {
    expect(passwordErrors('Secret123')).toEqual([]);
  });

  it('accepts exactly 8 and exactly 20 characters', () => {
    expect(passwordErrors('Secret12')).toEqual([]);
    expect(passwordErrors('Secret12345678901234')).toEqual([]);
  }, 'Межі включні: 8 і 20 символів дозволені. Перевір знаки < та >.');

  it('rejects 7 characters as too short', () => {
    expect(passwordErrors('Secret1')).toEqual(['too short']);
  });

  it('rejects 21 characters as too long', () => {
    expect(passwordErrors('Secret123456789012345')).toEqual(['too long']);
  });

  it('reports every broken rule in the given order', () => {
    expect(passwordErrors('secret')).toEqual(['too short', 'needs a digit', 'needs an uppercase letter']);
  }, 'Не зупиняйся на першій помилці: перевір усі правила і додавай повідомлення в порядку таблиці.');

  it('rejects spaces', () => {
    expect(passwordErrors('Secret 123')).toEqual(['no spaces allowed']);
  });

  it('reports everything for an empty password', () => {
    expect(passwordErrors('')).toEqual(['too short', 'needs a digit', 'needs an uppercase letter']);
  });
});
