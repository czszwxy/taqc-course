import { Profile } from './solution';

describe('Profile.email', () => {
  it('normalizes the email', () => {
    const p = new Profile();
    p.email = '  QA@Gadgetly.Test ';
    expect(p.email).toBe('qa@gadgetly.test');
  });
  it('rejects values without @ and keeps the old one', () => {
    const p = new Profile();
    p.email = 'a@b.c';
    expect(() => {
      p.email = 'qa';
    }).toThrow('Invalid email');
    expect(p.email).toBe('a@b.c');
  });
  it('starts empty', () => {
    expect(new Profile().email).toBe('');
  });
});
