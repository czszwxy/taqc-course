import { parseOrder } from './solution';

describe('parseOrder', () => {
  it('parses a valid order', () => {
    expect(parseOrder('{"id": 1003, "items": [{"productId": 1, "quantity": 2}]}')).toEqual({
      id: 1003,
      items: [{ productId: 1, quantity: 2 }],
    });
  });
  it('returns null for invalid JSON', () => {
    expect(parseOrder('{bad json')).toBeNull();
  }, 'JSON.parse кидає помилку — обгорни його в try/catch.');
  it('returns null when id is not a number', () => {
    expect(parseOrder('{"id": "1003", "items": []}')).toBeNull();
  });
  it('returns null when items is not an array', () => {
    expect(parseOrder('{"id": 1, "items": {}}')).toBeNull();
  });
  it('returns null when an item has a wrong shape', () => {
    expect(parseOrder('{"id": 1, "items": [{"productId": 1, "quantity": "2"}]}')).toBeNull();
  }, 'Перевір кожен елемент items: every(...)');
  it('returns null for JSON null and primitives', () => {
    expect(parseOrder('null')).toBeNull();
    expect(parseOrder('42')).toBeNull();
  }, 'typeof null === "object" — перевір value !== null.');
  it('drops unknown fields', () => {
    expect(parseOrder('{"id": 1, "items": [{"productId": 1, "quantity": 1, "x": 1}], "secret": "y"}')).toEqual({
      id: 1,
      items: [{ productId: 1, quantity: 1 }],
    });
  }, 'Збери новий об\'єкт лише з id та items (і лише productId, quantity в кожному).');
  it('accepts an order with no items', () => {
    expect(parseOrder('{"id": 7, "items": []}')).toEqual({ id: 7, items: [] });
  });
});
