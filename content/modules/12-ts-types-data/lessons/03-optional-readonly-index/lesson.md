# Optional, readonly та index signatures

Реальні дані рідко бувають «ідеальними»: частина полів необов'язкова, частину не можна змінювати, а деякі об'єкти — це словники з наперед невідомими ключами. TypeScript має інструменти для всіх трьох випадків.

## Необов'язкові поля: `?`

```ts
interface RunConfig {
  baseUrl: string;
  retries?: number;     // may be missing
  headless?: boolean;
}

const a: RunConfig = { baseUrl: 'https://staging.gadgetly.com' };          // ✅
const b: RunConfig = { baseUrl: 'http://localhost:5173', retries: 2 };      // ✅
```

Тип необов'язкового поля — `number | undefined`. Перед використанням його треба перевірити або дати **значення за замовчуванням**.

## Значення за замовчуванням: `??`

```ts
const retries = config.retries ?? 0;      // 0 only if retries is undefined or null
const headless = config.headless ?? true;
```

> [!WARNING]
> Не плутай `??` з `||`. `config.retries || 3` замінить і **явний** `0` на `3` (бо `0` — falsy), а `config.retries ?? 3` залишить `0`. Для чисел, `false` і порожніх рядків майже завжди потрібен `??`.

Також є **optional chaining** `?.`: `user.address?.city` — `undefined`, якщо `address` немає, замість помилки.

## readonly — не можна змінювати

```ts
interface TestUser {
  readonly id: number;
  readonly email: string;
  name: string;
}

const user: TestUser = { id: 1, email: 'qa@gadgetly.test', name: 'Olena' };
user.name = 'Olena T.';   // ✅
user.id = 2;              // ❌ Cannot assign to 'id' because it is a read-only property
```

Для масивів: `readonly string[]` (або `ReadonlyArray<string>`) — немає `push`, `pop`, `sort`…

```ts
function addTag(tags: readonly string[], tag: string): readonly string[] {
  return [...tags, tag];    // a new array instead of push
}
```

> [!NOTE]
> `readonly` — перевірка **компілятора**. Під час виконання JavaScript об'єкт можна змінити (якщо дуже захотіти). Для «заморожування» під час виконання є `Object.freeze`.

> [!QA]
> Спільні тестові дані (користувачі, конфіг середовища) — ідеальні кандидати на `readonly`. Якщо один тест випадково змінить спільного користувача, наступний тест упаде «без причини». readonly ловить таку помилку ще до запуску.

## Index signatures — словники

Коли ключі заздалегідь невідомі:

```ts
interface StatusCount {
  [status: string]: number;     // any string key → number
}

const counts: StatusCount = { passed: 12, failed: 3 };
counts['skipped'] = 1;          // ✅ any key
```

Коротший запис — утилітний тип `Record` (детально в уроці 8):

```ts
const counts: Record<string, number> = { passed: 12, failed: 3 };
```

Порахувати щось по групах — типова задача:

```ts
const statuses = ['passed', 'failed', 'passed'];
const counts: Record<string, number> = {};
for (const s of statuses) {
  counts[s] = (counts[s] ?? 0) + 1;     // the first time counts[s] is undefined
}
// { passed: 2, failed: 1 }
```

## Підсумок

- `field?: T` — поле може бути відсутнім; тип `T | undefined`.
- `??` дає значення за замовчуванням лише для `undefined`/`null` (на відміну від `||`).
- `readonly` забороняє присвоєння; `readonly T[]` — масив без змін.
- `{ [key: string]: number }` або `Record<string, number>` — словник із довільними ключами.
