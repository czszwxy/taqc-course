# Type aliases та interfaces

У модулі 11 ти вже писала типи об'єктів прямо в параметрах: `(user: { name: string; age: number })`. Коли той самий тип потрібен у багатьох місцях — тест-кейс, користувач, відповідь API — йому дають **ім'я**. Для цього є `type` і `interface`.

## type — ім'я для будь-якого типу

```ts
type TestUser = {
  email: string;
  password: string;
  age: number;
};

type Id = string;                     // alias for a primitive
type Matrix = number[][];             // for an array
type Status = 'passed' | 'failed';    // for a union (lesson 4)
```

## interface — опис форми об'єкта

```ts
interface TestCase {
  id: string;
  title: string;
  steps: string[];
  automated: boolean;
}

const tc: TestCase = { id: 'TC-1', title: 'Login works', steps: ['Open page'], automated: true };
```

Якщо пропустити поле, додати зайве або дати не той тип — **помилка компіляції**:

```ts
const bad: TestCase = { id: 'TC-2', title: 'Search' };
// ❌ Type '{ id: string; title: string; }' is missing the following properties: steps, automated
```

> [!QA]
> Це і є «тестування на етапі компіляції»: TypeScript перевіряє форму тестових даних ще до запуску. В автотестах інтерфейси описують тестових користувачів, тіла запитів і відповіді API — і помилка в назві поля ловиться одразу, а не через годину падінь.

## type чи interface?

| | `interface` | `type` |
|---|---|---|
| Об'єкти | ✅ | ✅ |
| Union, примітиви, кортежі | ❌ | ✅ |
| Розширення | `extends` | `&` (перетин) |
| Можна «доповнити» тим самим ім'ям | ✅ (declaration merging) | ❌ |

На практиці: для форми об'єктів часто беруть `interface`, для всього іншого — `type`. Головне — однаковість у проєкті.

## extends — розширення

```ts
interface Issue {
  id: number;
  title: string;
}

interface Bug extends Issue {
  severity: string;
  stepsToReproduce: string[];
}

const bug: Bug = { id: 12, title: 'Total is wrong', severity: 'Major', stepsToReproduce: ['Open cart'] };
```

`Bug` має всі поля `Issue` плюс свої.

## & — перетин типів

```ts
type WithTimestamps = { createdAt: string; updatedAt: string };
type StoredBug = Bug & WithTimestamps;   // all fields of both
```

## Типи функцій і методи

```ts
type Validator = (value: string) => boolean;

const isNotEmpty: Validator = (value) => value.trim().length > 0;

interface Page {
  url: string;
  open(): void;                       // method
  fill(field: string, value: string): void;
}
```

> [!TIP]
> У типу функції параметри можна не підписувати вдруге: `const isNotEmpty: Validator = (value) => …` — TypeScript сам знає, що `value: string`.

## Експорт типів

Типи експортують так само, як функції: `export interface TestCase { … }`, `export type Validator = …`. Імпортують теж: `import { type TestCase } from './models';` (про модулі — в модулі 13).

## Підсумок

- `type` дає ім'я будь-якому типу; `interface` описує форму об'єкта.
- Компілятор ловить відсутні, зайві й неправильні поля.
- `interface B extends A` — розширення; `A & B` — перетин.
- Типи функцій: `type Validator = (value: string) => boolean`.
