import { passwordStrength } from './subject';

describe('passwordStrength', () => {
  it('short password is weak', () => {
    expect(passwordStrength('Ab1')).toBe('weak');
  });

  // твій код тут: тести для інших класів і межі довжини
});
