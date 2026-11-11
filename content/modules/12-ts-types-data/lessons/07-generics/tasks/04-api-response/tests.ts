import { pluck, unwrap } from './solution';

type User = { id: number; email: string };
const users: User[] = [
  { id: 42, email: 'qa@gadgetly.test' },
  { id: 17, email: 'taras@gadgetly.test' },
];

export function compileTimeChecks(): void {
  // @ts-expect-error 'emial' is not a key of User
  pluck(users, 'emial');
  const ids: number[] = pluck(users, 'id');
  const list: number[] = unwrap({ status: 200, data: [1] });
  void ids;
  void list;
}

describe('unwrap', () => {
  it('returns data for successful responses', () => {
    expect(unwrap({ status: 200, data: [1, 2] })).toEqual([1, 2]);
    expect(unwrap({ status: 201, data: 'created' })).toBe('created');
  });
  it('throws for 4xx and 5xx', () => {
    expect(() => unwrap({ status: 404, data: null })).toThrow('Request failed with status 404');
    expect(() => unwrap({ status: 500, data: null })).toThrow('500');
  }, 'Статус 400 і вище — помилка: throw new Error(...).');
  it('400 is already an error', () => {
    expect(() => unwrap({ status: 400, data: null })).toThrow();
  }, 'Межа: 400 — це вже помилка (>= 400).');
});

describe('pluck', () => {
  it('takes one field from every item', () => {
    expect(pluck(users, 'email')).toEqual(['qa@gadgetly.test', 'taras@gadgetly.test']);
    expect(pluck(users, 'id')).toEqual([42, 17]);
  });
  it('returns [] for no items', () => {
    expect(pluck([] as User[], 'id')).toEqual([]);
  });
});
