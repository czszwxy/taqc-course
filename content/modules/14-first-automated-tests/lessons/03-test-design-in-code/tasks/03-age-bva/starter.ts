import { canRegister } from './subject';

describe('canRegister', () => {
  it('accepts a typical adult age', () => {
    expect(canRegister(30)).toBe(true);
  });

  // твій код тут: граничні значення і дробовий вік
});
