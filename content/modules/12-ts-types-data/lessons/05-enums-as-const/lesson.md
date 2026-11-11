# Enums та as const

Severity, priority, ролі користувачів, середовища — це **фіксовані набори** значень. Ти вже вмієш описати їх literal union (`'High' | 'Medium' | 'Low'`). Але часто потрібні ще й **значення під час виконання**: список ролей для перебору, словник статус-кодів. Для цього є `enum` і `as const`.

## Рядкові enum

```ts
enum Severity {
  Blocker = 'Blocker',
  Critical = 'Critical',
  Major = 'Major',
  Minor = 'Minor',
}

function isUrgent(sev: Severity): boolean {
  return sev === Severity.Blocker || sev === Severity.Critical;
}

isUrgent(Severity.Major);   // false
isUrgent('Major');          // ❌ a plain string is not a Severity
```

`enum` — це і **тип**, і **об'єкт** під час виконання: `Object.values(Severity)` дасть `['Blocker', 'Critical', 'Major', 'Minor']`.

## Числові enum

```ts
enum Priority { Low, Medium, High }   // 0, 1, 2
Priority.High;                         // 2
```

> [!WARNING]
> Числові enum легко зробити крихкими: вставиш новий елемент посередині — зміняться всі числа після нього. У тестах і API надійніші **рядкові** значення.

## as const: незмінні значення з точними типами

```ts
const ROLES = ['admin', 'customer', 'guest'] as const;
// type: readonly ['admin', 'customer', 'guest'] — not just string[]

type Role = (typeof ROLES)[number];        // 'admin' | 'customer' | 'guest'
```

Для об'єктів:

```ts
const STATUS = { ok: 200, created: 201, notFound: 404 } as const;

type StatusName = keyof typeof STATUS;              // 'ok' | 'created' | 'notFound'
type StatusCode = (typeof STATUS)[StatusName];      // 200 | 201 | 404

STATUS.ok = 500;   // ❌ readonly
```

Розшифровка: `typeof STATUS` — тип об'єкта; `keyof` — union його ключів; `(typeof ROLES)[number]` — тип будь-якого елемента масиву.

## enum чи as const?

| | `enum` | `as const` |
|---|---|---|
| Значення під час виконання | ✅ | ✅ |
| Union-тип | `Severity` | треба вивести: `keyof typeof` / `[number]` |
| Звичайний рядок `'Major'` підходить? | ❌ лише `Severity.Major` | ✅ |
| Це «чистий» JavaScript | ❌ (TypeScript-синтаксис) | ✅ |

Обидва підходи нормальні; багато команд, зокрема в Playwright-проєктах, обирають `as const`.

> [!QA]
> Тестові дані з `as const` — зручне джерело для **параметризованих тестів**: `` for (const role of ROLES) test(`${role} can log in`, …) ``. Додав роль у масив — і тест для неї з'явився автоматично (модуль 16).

## Підсумок

- Рядковий `enum` — набір іменованих значень, тип і об'єкт водночас.
- `as const` робить масив/об'єкт readonly з точними літеральними типами.
- `(typeof ARR)[number]` — union елементів; `keyof typeof OBJ` — union ключів.
- Уникай числових enum для даних, що йдуть в API чи звіти.
