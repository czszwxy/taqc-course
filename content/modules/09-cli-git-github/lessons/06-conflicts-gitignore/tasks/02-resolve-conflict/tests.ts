import { testUsers, loginUrl } from './solution';

describe('resolved test data', () => {
  it('admin uses the NEW email from main', () => {
    expect(testUsers['admin']?.email).toBe('qa.admin@gadgetly.test');
    expect(testUsers['admin']?.role).toBe('admin');
  }, 'Рядок admin візьми з main (верхня частина конфлікту): старого admin@gadgetly.test у тестовій базі вже немає.');

  it('customer is kept', () => {
    expect(testUsers['customer']?.email).toBe('olena.kovalenko@gadgetly.test');
  }, 'customer однаковий в обох версіях — він має лишитися рівно один раз.');

  it('blockedUser from your branch is kept', () => {
    expect(testUsers['blockedUser']?.email).toBe('blocked.user@gadgetly.test');
    expect(testUsers['blockedUser']?.blocked).toBe(true);
  }, 'Не загуби свою зміну: blockedUser з нижньої частини конфлікту має лишитися.');

  it('there are exactly 3 users', () => {
    expect(Object.keys(testUsers)).toHaveLength(3);
  }, 'Мають бути рівно admin, customer і blockedUser — без дублікатів і зайвих записів.');
});

describe('resolved loginUrl', () => {
  it('combines the new path from main with your redirect parameter', () => {
    expect(loginUrl('https://staging.gadgetly.test')).toBe('https://staging.gadgetly.test/auth/login?redirect=/cart');
  }, 'Потрібні обидві зміни: шлях /auth/login (з main) і параметр ?redirect=/cart (з твоєї гілки).');

  it('works for another base URL', () => {
    expect(loginUrl('http://localhost:5173')).toBe('http://localhost:5173/auth/login?redirect=/cart');
  }, 'Не вписуй адресу staging у функцію: використовуй параметр baseUrl.');
});
