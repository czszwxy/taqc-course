# Union і literal types, звуження типу

Статус тесту — це не «будь-який рядок», а одне з кількох значень. Відповідь API — або дані, або помилка. TypeScript уміє описати саме це, і тоді компілятор не дасть ні опечататися в статусі, ні забути обробити помилку.

## Union: «або те, або інше»

```ts
let id: string | number;
id = 'TC-1';   // ✅
id = 42;       // ✅
id = true;     // ❌
```

## Literal types: лише конкретні значення

```ts
type TestStatus = 'passed' | 'failed' | 'skipped';
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

let status: TestStatus = 'passed';
status = 'pased';    // ❌ Type '"pased"' is not assignable to type 'TestStatus'
```

> [!QA]
> Literal types — найдешевший захист від опечаток у тестах: `'Faild'` замість `'Failed'` не скомпілюється. А редактор підказує всі допустимі значення в автодоповненні.

## Narrowing: звуження типу

Зі значенням типу `string | number` можна робити лише те, що вміють **обидва** типи. Щоб викликати `toFixed`, спершу треба переконатися, що це число:

```ts
function format(value: string | number): string {
  if (typeof value === 'number') {
    return value.toFixed(2);       // here value: number
  }
  return value.toUpperCase();      // here value: string
}
```

Способи звуження:

| Перевірка | Приклад |
|---|---|
| `typeof` | `typeof x === 'string'` |
| порівняння | `if (status === 'failed')` |
| `in` | `if ('error' in response)` |
| `Array.isArray` | `if (Array.isArray(x))` |
| перевірка на `undefined`/`null` | `if (user)` / `if (user !== undefined)` |

## Discriminated unions

Об'єкти різних форм з **спільним полем-ярликом**:

```ts
type LoginResult =
  | { ok: true; token: string }
  | { ok: false; status: number; message: string };

function describe(result: LoginResult): string {
  if (result.ok) {
    return `Token: ${result.token}`;          // TypeScript knows: token exists
  }
  return `Error ${result.status}: ${result.message}`;
}
```

Поле `ok` (або `kind`, `type`, `status`) — **дискримінант**: перевіривши його, TypeScript знає, яка це форма.

## switch і перевірка на повноту

```ts
function icon(status: TestStatus): string {
  switch (status) {
    case 'passed': return '✅';
    case 'failed': return '❌';
    case 'skipped': return '⏭';
    default: {
      const unreachable: never = status;   // error if a case is forgotten
      return unreachable;
    }
  }
}
```

Якщо колись додати статус `'flaky'` і забути `case`, рядок з `never` не скомпілюється — компілятор нагадає про всі місця, де треба оновити код.

> [!TIP]
> Замість `switch` часто використовують об'єкт-словник: `const ICONS: Record<TestStatus, string> = { passed: '✅', failed: '❌', skipped: '⏭' };` — TypeScript теж перевірить, що є **всі** ключі.

## Підсумок

- `A | B` — значення одного з типів; literal types — лише конкретні значення.
- Перед специфічною дією тип звужують: `typeof`, `===`, `in`, `Array.isArray`, перевірка на `undefined`.
- Discriminated union: спільне поле-ярлик визначає форму об'єкта.
- `never` у `default` гарантує, що оброблено всі варіанти.
