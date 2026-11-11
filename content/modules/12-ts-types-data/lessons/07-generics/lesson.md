# Generics

Уяви функцію «взяти перший елемент масиву». Для масиву рядків вона повертає рядок, для масиву чисел — число, для масиву користувачів — користувача. Без generics довелося б або писати три функції, або повертати `any` і втратити перевірку типів. **Generics** дозволяють написати одну функцію, яка зберігає точний тип.

## Generic-функція

```ts
function first<T>(items: T[]): T | undefined {
  return items[0];
}

const n = first([10, 20]);          // n: number | undefined
const s = first(['a', 'b']);        // s: string | undefined
const u = first(users);             // u: User | undefined
```

`T` — **параметр типу**, «змінна для типу». TypeScript сам виводить `T` з аргументу. Можна вказати явно: `first<string>([])`.

> [!NOTE]
> Порівняй з `any`: `function first(items: any[]): any` теж «працює», але `first([10]).toUpperCase()` скомпілюється і впаде під час виконання. Generic зберігає тип і ловить таку помилку.

## Кілька параметрів і функції-аргументи

```ts
function mapValues<T, R>(items: T[], fn: (item: T) => R): R[] {
  return items.map(fn);
}

mapValues(users, (u) => u.email);   // string[] — R inferred from the callback
```

## Обмеження: extends

Іноді від `T` потрібна певна властивість:

```ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
longest('abc', 'de');      // ✅ strings have length
longest([1, 2], [3]);      // ✅ arrays too
longest(10, 20);           // ❌ number has no length
```

## keyof у generics

```ts
function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

pluck(users, 'email');     // string[]
pluck(users, 'emial');     // ❌ typo caught: not a key of User
```

`K extends keyof T` — «K є одним із ключів T», а `T[K]` — тип значення за цим ключем.

## Generic-інтерфейси і типи

```ts
interface ApiResponse<T> {
  status: number;
  data: T;
}

const res: ApiResponse<User[]> = { status: 200, data: [] };
type Page<T> = { items: T[]; total: number };
```

Ти вже використовувала generics, навіть не знаючи: `Array<string>` = `string[]`, `Record<string, number>`, `Promise<Response>`.

> [!QA]
> У Playwright generics усюди: `page.evaluate<T>()`, `response.json()` типізують через `as` або generic-обгортки, фікстури описують як `test.extend<{ loginPage: LoginPage }>()`. Розуміння `<T>` — ключ до читання документації й типів Playwright.

## Підсумок

- `<T>` — параметр типу; TypeScript зазвичай виводить його сам.
- Generic зберігає точний тип замість `any`.
- `T extends X` — обмеження; `K extends keyof T` і `T[K]` — робота з ключами.
- Generic-інтерфейси: `ApiResponse<T>`, `Page<T>`; вбудовані: `Array<T>`, `Record<K, V>`, `Promise<T>`.
