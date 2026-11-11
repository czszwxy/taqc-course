# describe, it, expect і матчери

## describe і it

```ts
describe('cartSummary', () => {               // a group: what we test
  it('counts all pieces', () => { … });       // one test: which behaviour
  it('sums price × qty', () => { … });

  describe('with an empty cart', () => {      // groups can be nested
    it('returns zeros', () => { … });
  });
});
```

- `describe` групує тести — зазвичай за функцією, класом або сторінкою.
- `it` (або `test` — те саме) — один тест.
- Назва `it` читається як речення: «cartSummary **counts all pieces**». У звіті одразу видно, що зламалося.

> [!TIP]
> Погана назва: `it('test 1')`, `it('works')`. Хороша: `it('rejects quantity 0')`, `it('returns undefined for an unknown name')`. Назва = очікувана поведінка.

## expect і матчери

`expect(actual)` бере фактичне значення, а **матчер** порівнює його з очікуваним:

| Матчер | Коли | Приклад |
|---|---|---|
| `toBe` | примітиви (числа, рядки, boolean) | `expect(total).toBe(1500)` |
| `toEqual` | об'єкти й масиви (порівнює вміст) | `expect(summary).toEqual({ count: 3, total: 1500 })` |
| `toContain` | елемент у масиві / підрядок | `expect(names).toContain('Mouse')` |
| `toHaveLength` | довжина масиву чи рядка | `expect(items).toHaveLength(2)` |
| `toBeUndefined` / `toBeNull` | «нічого не знайдено» | `expect(findLine(lines, 'X')).toBeUndefined()` |
| `toBeTruthy` / `toBeFalsy` | будь-що «правдиве» / «хибне» | `expect(isValid).toBeTruthy()` |
| `toBeCloseTo` | дробові числа | `expect(avg).toBeCloseTo(33.33, 2)` |
| `toBeGreaterThan` … | порівняння | `expect(ms).toBeLessThan(1000)` |
| `toMatch` | регулярний вираз / підрядок | `expect(id).toMatch(/^TC-\d+$/)` |
| `toThrow` | функція кидає помилку | `expect(() => parseQty('0')).toThrow('Invalid')` |

`.not` перевертає будь-який матчер: `expect(names).not.toContain('Cable')`.

## toBe vs toEqual

```ts
expect({ a: 1 }).toBe({ a: 1 });     // ❌ fails: two different objects
expect({ a: 1 }).toEqual({ a: 1 });  // ✅ same content
```

`toBe` перевіряє, що це **той самий** об'єкт (або те саме примітивне значення). Для вмісту об'єктів і масивів — `toEqual`.

## Дробові числа

```ts
0.1 + 0.2 === 0.3;                         // false! (0.30000000000000004)
expect(0.1 + 0.2).toBeCloseTo(0.3);        // ✅
```

## Помилки

```ts
expect(() => parseQuantity('11')).toThrow();                  // any error
expect(() => parseQuantity('11')).toThrow('Invalid quantity'); // the message contains…
expect(() => parseQuantity('11')).toThrow(RangeError);        // a type
```

> [!WARNING]
> `expect(parseQuantity('11')).toThrow()` — **неправильно**: функція виконається до `expect` і помилка вилетить раніше. Завжди загортай у стрілку `() => …`.

## Підсумок

- `describe` — група, `it`/`test` — тест; назва = очікувана поведінка.
- `toBe` — примітиви, `toEqual` — вміст об'єктів/масивів.
- `toContain`, `toHaveLength`, `toBeUndefined`, `toBeCloseTo`, `toThrow`, `.not`.
- Помилки перевіряють через `expect(() => fn()).toThrow(...)`.
