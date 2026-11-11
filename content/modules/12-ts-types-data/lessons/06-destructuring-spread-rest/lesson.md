# Деструктуризація, spread і rest

Ці три інструменти ти бачитимеш у **кожному** тесті Playwright:

```ts
test('login works', async ({ page }) => { … });   // destructuring of the fixtures object
```

`{ page }` — це деструктуризація: з об'єкта фікстур дістається поле `page`. Розберімося, як це працює.

## Деструктуризація об'єкта

```ts
const user = { name: 'Olena', email: 'qa@gadgetly.test', role: 'customer' };

const { name, email } = user;              // name = 'Olena', email = 'qa@…'
const { role: userRole } = user;           // rename: userRole = 'customer'
const { phone = 'n/a' } = user as { phone?: string };  // default value
```

У параметрах функції — найчастіше:

```ts
function greet({ name, role = 'guest' }: { name: string; role?: string }): string {
  return `Hi, ${name} (${role})`;
}
greet({ name: 'Taras' });   // 'Hi, Taras (guest)'
```

## Деструктуризація масиву

```ts
const [first, second] = ['login', 'cart', 'search'];   // 'login', 'cart'
const [, , third] = ['login', 'cart', 'search'];       // skip elements: 'search'
const [a, b] = [b0, a0];                                // swap values
```

## Spread `...` — «розгорнути»

```ts
const base = { headless: true, retries: 0 };
const ci = { ...base, retries: 2 };            // copy + override: { headless: true, retries: 2 }

const smoke = ['login', 'cart'];
const all = [...smoke, 'search', 'profile'];   // a new array
Math.max(...[3, 9, 4]);                         // 9 — spread into arguments
```

> [!TIP]
> Порядок має значення: поля, написані **пізніше**, перезаписують попередні. `{ ...base, retries: 2 }` → retries 2; `{ retries: 2, ...base }` → retries 0.

> [!WARNING]
> Spread робить **поверхневу** копію: вкладені об'єкти й масиви залишаються спільними. `copy.address.city = 'Kyiv'` змінить і оригінал.

## Rest `...` — «зібрати решту»

Той самий `...`, але **зліва** або в параметрах — збирає решту:

```ts
const { password, ...safeUser } = userWithPassword;   // safeUser has no password
const [head, ...tail] = ['a', 'b', 'c'];              // head = 'a', tail = ['b', 'c']

function sum(...numbers: number[]): number {           // any number of arguments
  return numbers.reduce((s, n) => s + n, 0);
}
sum(1, 2, 3);   // 6
```

> [!QA]
> `const { password, ...safe } = user` — класичний спосіб прибрати секрети перед тим, як вивести дані в лог чи звіт. Логи тестів часто потрапляють у CI — паролі й токени там не повинні з'являтися.

## Підсумок

- `const { a, b: renamed, c = 1 } = obj` — деструктуризація об'єкта з перейменуванням і значенням за замовчуванням.
- `const [x, , z] = arr` — деструктуризація масиву.
- Spread (`...` справа) — копіювати й об'єднувати; пізніші поля перемагають; копія поверхнева.
- Rest (`...` зліва / у параметрах) — зібрати решту полів, елементів чи аргументів.
