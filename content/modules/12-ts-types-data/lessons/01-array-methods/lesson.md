# Методи масивів: map, filter, find, reduce, sort

У модулі 11 ти обробляла масиви циклами `for`. Це працює, але в реальному коді автотестів (і в Playwright) майже завжди використовують **методи масивів**: вони коротші, читаються як речення і не змінюють вихідні дані.

```ts
// loop
const names: string[] = [];
for (const t of tests) {
  if (t.status === 'failed') names.push(t.title);
}

// array methods — the same in one line
const names = tests.filter((t) => t.status === 'failed').map((t) => t.title);
```

Усі приклади нижче — для такого масиву:

```ts
type TestRun = { title: string; status: string; durationMs: number };

const runs: TestRun[] = [
  { title: 'login works', status: 'passed', durationMs: 1200 },
  { title: 'cart total', status: 'failed', durationMs: 3400 },
  { title: 'search', status: 'passed', durationMs: 800 },
];
```

## map — перетворити кожен елемент

Повертає **новий** масив тієї самої довжини.

```ts
runs.map((r) => r.title);              // ['login works', 'cart total', 'search']
runs.map((r) => r.durationMs / 1000);  // [1.2, 3.4, 0.8]
runs.map((r, index) => `${index + 1}. ${r.title}`);
```

## filter — залишити ті, що підходять

Повертає новий масив з елементами, для яких функція повернула `true`.

```ts
runs.filter((r) => r.status === 'failed');        // 1 element
runs.filter((r) => r.durationMs > 1000).length;   // 2
```

## find, findIndex — знайти перший

```ts
runs.find((r) => r.title === 'search');      // { title: 'search', … }
runs.find((r) => r.title === 'checkout');    // undefined — not found!
runs.findIndex((r) => r.status === 'failed'); // 1 (or -1 if not found)
```

> [!WARNING]
> `find` може повернути `undefined`. TypeScript про це знає: тип результату `TestRun | undefined`. Перед використанням перевір: `if (found) { … }` або `found?.title`.

## some, every — так чи ні

```ts
runs.some((r) => r.status === 'failed');   // true — at least one failed
runs.every((r) => r.status === 'passed');  // false — not all passed
[].every((r) => false);                    // true! every on an empty array is true
```

## reduce — згорнути масив в одне значення

```ts
const total = runs.reduce((sum, r) => sum + r.durationMs, 0);  // 5400
//                          ↑ accumulator  ↑ current       ↑ start value
```

`reduce` проходить елементи по черзі й передає «накопичувач» далі. **Завжди давай початкове значення** (`0`, `[]`, `{}`) — без нього порожній масив викличе помилку.

## sort — упорядкувати

```ts
const byDuration = [...runs].sort((a, b) => a.durationMs - b.durationMs);   // fastest first
const byTitle = [...runs].sort((a, b) => a.title.localeCompare(b.title));   // A → Z
```

> [!IMPORTANT]
> `sort` **змінює** вихідний масив. Тому спочатку роби копію: `[...runs].sort(...)`. А для чисел **завжди** передавай функцію порівняння: `[10, 9, 100].sort()` дасть `[10, 100, 9]` — бо порівнює як рядки.

Функція порівняння повертає: від'ємне число — `a` раніше, додатне — `b` раніше, `0` — рівні.

## join, includes

```ts
runs.map((r) => r.title).join(', ');   // 'login works, cart total, search'
['passed', 'failed'].includes('skipped');  // false
```

## Ланцюжки

Методи можна з'єднувати, бо `map` і `filter` повертають масиви:

```ts
const slowFailed = runs
  .filter((r) => r.status === 'failed')
  .filter((r) => r.durationMs > 3000)
  .map((r) => r.title);
```

> [!QA]
> Так виглядає типовий код у тестах: «знайди всі рядки таблиці зі статусом Paid», «перевір, що **кожна** ціна більша за 0» (`every`), «порахуй суму» (`reduce`), «перевір, що список відсортований» (порівняй з `[...list].sort(...)`).

## Підсумок

- `map` — перетворити; `filter` — відібрати; `find` — перший або `undefined`.
- `some` / `every` — чи є хоч один / чи всі.
- `reduce` — згорнути в одне значення; завжди з початковим значенням.
- `sort` змінює масив — копіюй `[...arr]`; для чисел — `(a, b) => a - b`.
- Методи з'єднуються в ланцюжки й не змінюють вихідні дані (крім `sort`).
