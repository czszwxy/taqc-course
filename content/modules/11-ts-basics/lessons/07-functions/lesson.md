# Функції

Функція — це іменований блок коду, який можна викликати багато разів з різними даними. В автотестах функції повсюди: `login(user)`, `addToCart(product)`, `createTestUser()`. А сам тест у Playwright — теж функція.

## Оголошення і виклик

```ts
function greet(name: string): string {
  return `Hello, ${name}!`;
}

greet('Olena'); // 'Hello, Olena!'
greet('Taras'); // 'Hello, Taras!'
```

| Частина | Значення |
|---|---|
| `name: string` | **параметр** з типом: «змінна», яку функція отримує |
| `: string` після дужок | **тип результату** (return type) |
| `return` | повертає значення і **одразу завершує** функцію |
| `'Olena'` під час виклику | **аргумент**: конкретне значення параметра |

> [!IMPORTANT]
> У strict-режимі TypeScript вимагає типи параметрів. Без них буде помилка `Parameter 'name' implicitly has an 'any' type`. Тип результату TypeScript може вивести сам, але в цьому курсі ми пишемо його явно: так зрозуміліший намір.

## Кілька параметрів

```ts
function calcTotal(price: number, quantity: number): number {
  return price * quantity;
}

calcTotal(19.99, 3); // 59.97
calcTotal(5);        // ❌ Expected 2 arguments, but got 1
```

TypeScript перевіряє кількість і типи аргументів, тож помилку видно ще до запуску.

## void: функція нічого не повертає

```ts
function logStep(step: string): void {
  console.log(`▶ ${step}`);
}
```

## Параметри за замовчуванням

Якщо аргумент не передали, береться значення за замовчуванням:

```ts
function openPage(path: string, baseUrl: string = 'https://staging.example.com'): string {
  return baseUrl + path;
}

openPage('/login');                           // 'https://staging.example.com/login'
openPage('/login', 'http://localhost:3000'); // 'http://localhost:3000/login'
```

## Необов'язкові параметри `?`

```ts
function formatName(first: string, last?: string): string {
  if (last) {
    return `${first} ${last}`;
  }
  return first;
}

formatName('Olena');            // 'Olena'
formatName('Olena', 'Kovalenko'); // 'Olena Kovalenko'
```

Необов'язковий параметр має тип `string | undefined`, тому перед використанням його треба перевірити. Необов'язкові параметри пишуться **після** обов'язкових.

## Стрілкові функції

Коротший синтаксис, дуже поширений у сучасному коді та в Playwright:

```ts
const double = (n: number): number => {
  return n * 2;
};

// якщо тіло — один вираз, можна без { } і return:
const triple = (n: number): number => n * 3;

double(4); // 8
triple(4); // 12
```

Тест у Playwright теж має стрілкову функцію: `test('login works', async ({ page }) => { ... })`. Ти побачиш таку форму сотні разів.

## Область видимості (scope)

Змінні, оголошені **всередині** функції (або будь-якого блоку `{}`), не видно ззовні:

```ts
function check(): void {
  const result = 'ok';
}
console.log(result); // ❌ Cannot find name 'result'
```

А функція бачить змінні ззовні. Але краще передавати все потрібне через параметри: так функцію простіше зрозуміти й перевірити.

## Чисті функції

**Чиста функція** (pure function):

1. з однаковими аргументами завжди повертає однаковий результат;
2. нічого не змінює ззовні (не міняє глобальні змінні, не пише у файли).

```ts
// чиста
const add = (a: number, b: number): number => a + b;

// нечиста: змінює зовнішню змінну
let total = 0;
function addToTotal(n: number): void {
  total += n;
}
```

> [!QA]
> Чисті функції найлегше тестувати: передав вхід, перевірив вихід. Саме так працюють приховані тести в задачах. У модулі «Your First Automated Tests» ти писатимеш такі тести сам.

## Функції викликають функції

Великі задачі розбивають на маленькі функції:

```ts
const normalize = (s: string): string => s.trim().toLowerCase();

function isSameUser(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}
```

### Поради щодо назв

- Назва з дієслова: `getTotal`, `isValid`, `buildUrl`, `formatDate`.
- Одна функція — одна відповідальність. Якщо назва виходить «getAndValidateAndSave», функцію варто розбити.

## Підсумок

- `function name(param: Type): ReturnType { return ... }`.
- `void` — функція нічого не повертає.
- Параметри за замовчуванням `= value` і необов'язкові `param?: Type`.
- Стрілкові функції: `(a: number): number => a * 2`.
- Змінні всередині функції не видно ззовні.
- Чисті функції легко тестувати.
