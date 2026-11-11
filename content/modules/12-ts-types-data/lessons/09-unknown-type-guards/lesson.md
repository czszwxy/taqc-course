# unknown vs any, type guards

Дані з API, з файлу чи з `JSON.parse` приходять «ззовні»: компілятор не знає, що всередині. Тестувальник особливо мусить бути обережним: **перевіряти** дані — це і є наша робота. TypeScript дає для цього `unknown` і type guards.

## any — вимкнути перевірку

```ts
const data: any = JSON.parse('{"price": "499"}');
data.price.toFixed(2);   // compiles… and crashes: price is a string!
data.whatever.deep;      // compiles too
```

`any` означає «компіляторе, не втручайся». Помилки переїжджають із компіляції у виконання — туди, де їх знайдуть користувачі (або нестабільні тести).

## unknown — «невідомо, перевір спочатку»

```ts
const data: unknown = JSON.parse('{"price": 499}');
data.price;                              // ❌ 'data' is of type 'unknown'

if (typeof data === 'object' && data !== null && 'price' in data && typeof data.price === 'number') {
  data.price.toFixed(2);                 // ✅ checked
}
```

Зі значенням типу `unknown` нічого не можна робити, поки не звузиш тип. Саме це й потрібно для зовнішніх даних.

> [!TIP]
> Правило: дані ззовні — `unknown`, далі перевірка, далі робота з точним типом. `any` — лише як тимчасова латка (і з коментарем «чому»).

## Власні type guards: `value is T`

Перевірку форми зручно винести у функцію з **type predicate**:

```ts
interface Product {
  id: number;
  name: string;
  price: number;
}

function isProduct(value: unknown): value is Product {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'number' && typeof v.name === 'string' && typeof v.price === 'number';
}

const data: unknown = await response.json();
if (isProduct(data)) {
  console.log(data.price.toFixed(2));   // data: Product here
}
```

`value is Product` каже компілятору: «якщо функція повернула `true`, вважай `value` типом `Product`».

> [!WARNING]
> Компілятор **вірить** type guard на слово. Якщо guard перевіряє не все (забула `price`), TypeScript усе одно вважатиме значення `Product`. Тому guards — це код, який теж треба тестувати.

## Корисні перевірки

| Що перевірити | Як |
|---|---|
| рядок / число / boolean | `typeof v === 'string'` |
| не null-об'єкт | `typeof v === 'object' && v !== null` |
| масив | `Array.isArray(v)` |
| ціле число | `Number.isInteger(v)` |
| усі елементи масиву | `v.every(isProduct)` |
| екземпляр класу | `v instanceof Error` |

## Безпечний JSON.parse

`JSON.parse` кидає помилку на невалідному JSON. Безпечна обгортка:

```ts
function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
```

> [!QA]
> Ця тема — прямий місток до API-тестів: «відповідь має правильну форму» — це type guard (або JSON Schema). Тест не має вірити, що сервер повернув `Product[]`; він має це **перевірити**.

## Підсумок

- `any` вимикає перевірку типів; `unknown` вимагає перевірки перед використанням.
- Type guard: `function isX(v: unknown): v is X` — звужує тип після `if`.
- Перевіряй: `typeof`, `!== null`, `Array.isArray`, `Number.isInteger`, `every`.
- `JSON.parse` у `try/catch`; результат — `unknown`.
