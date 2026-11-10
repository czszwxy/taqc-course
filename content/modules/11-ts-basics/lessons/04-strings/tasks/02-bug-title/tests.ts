import { formatBugTitle } from './solution';

describe('formatBugTitle', () => {
  it("formats 'login' + summary", () => {
    expect(formatBugTitle('login', 'Error on empty password')).toBe('[LOGIN] Error on empty password');
  }, 'Формат: квадратні дужки, назва великими, пробіл, опис.');

  it('trims spaces around both parts', () => {
    expect(formatBugTitle('  cart ', '  Total is not updated ')).toBe('[CART] Total is not updated');
  }, 'Використай trim() для обох параметрів.');

  it('keeps the case of the summary', () => {
    expect(formatBugTitle('API', 'GET /users returns 500')).toBe('[API] GET /users returns 500');
  }, 'Великими робимо тільки компонент, опис залишаємо як є.');

  it('works with a multi-word component', () => {
    expect(formatBugTitle('user profile', 'Avatar is not saved')).toBe('[USER PROFILE] Avatar is not saved');
  });
});
