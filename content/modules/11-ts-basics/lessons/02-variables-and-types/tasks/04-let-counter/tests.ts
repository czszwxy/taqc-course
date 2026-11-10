import { countRetries } from './solution';

describe('countRetries', () => {
  it('returns 3', () => {
    expect(countRetries()).toBe(3);
  }, 'Якщо бачиш TypeError "Assignment to constant variable" — змінна все ще const.');

  it('returns a number', () => {
    expect(typeof countRetries()).toBe('number');
  });
});
