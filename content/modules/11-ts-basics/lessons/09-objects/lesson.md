# Об'єкти

Об'єкт групує пов'язані дані під іменами. Користувач для тесту, баг у трекері, відповідь API, налаштування Playwright — усе це об'єкти.

## Об'єктний літерал

```ts
const user = {
  name: 'Olena',
  email: 'olena@example.com',
  age: 28,
  isAdmin: false,
};
```

Кожна пара `ключ: значення` — це **властивість** (property).

## Доступ до властивостей

```ts
user.name;          // 'Olena' — через крапку (найчастіше)
user['email'];      // 'olena@example.com' — через дужки

const field = 'age';
user[field];        // 28 — дужки потрібні, коли ім'я властивості в змінній
```

## Зміна і додавання

```ts
user.age = 29;      // змінити властивість
```

`const` забороняє перепризначити змінну `user`, але **не** забороняє змінювати властивості. Як і з масивами.

TypeScript не дасть звернутися до неіснуючої властивості чи присвоїти значення іншого типу:

```ts
user.phone;        // ❌ Property 'phone' does not exist on type ...
user.age = 'old';  // ❌ Type 'string' is not assignable to type 'number'
```

## Типи об'єктів

Тип об'єкта описує, які властивості в нього є і яких вони типів:

```ts
function greet(user: { name: string; age: number }): string {
  return `Hi, ${user.name} (${user.age})`;
}
```

Щоб не повторювати довгий тип, йому дають ім'я через `type` (детальніше про `type` і `interface` — у наступному модулі):

```ts
type Bug = {
  id: number;
  title: string;
  severity: string;
  status: string;
};

const bug: Bug = { id: 101, title: 'Login fails', severity: 'Critical', status: 'Open' };
```

### Необов'язкові властивості

```ts
type TestUser = {
  email: string;
  password: string;
  nickname?: string;    // може бути відсутня
};

const u: TestUser = { email: 'a@b.com', password: 'Secret123' }; // ✅ без nickname
```

Тип `nickname` — `string | undefined`, тому перед використанням його треба перевірити.

## Вкладені об'єкти та масиви об'єктів

```ts
const order = {
  id: 'A-17',
  customer: { name: 'Taras', city: 'Lviv' },
  items: [
    { sku: 'KB-1', price: 1200, qty: 1 },
    { sku: 'MS-2', price: 450, qty: 2 },
  ],
};

order.customer.city;    // 'Lviv'
order.items[1].price;   // 450
order.items.length;     // 2
```

Масив об'єктів — найпоширеніша форма даних в API: список користувачів, товарів, замовлень.

```ts
let total = 0;
for (const item of order.items) {
  total += item.price * item.qty;
}
console.log(total); // 2100
```

## Перебір властивостей

```ts
const counts = { open: 3, closed: 10, reopened: 1 };

Object.keys(counts);    // ['open', 'closed', 'reopened']
Object.values(counts);  // [3, 10, 1]
Object.entries(counts); // [['open', 3], ['closed', 10], ['reopened', 1]]

for (const [status, count] of Object.entries(counts)) {
  console.log(`${status}: ${count}`);
}
```

## Скорочений запис властивостей

Якщо ім'я змінної збігається з ім'ям властивості:

```ts
const email = 'qa@test.com';
const password = 'Secret123';
const creds = { email, password }; // те саме, що { email: email, password: password }
```

## Копіювання та незмінні оновлення

Об'єкти, як і масиви, передаються **за посиланням**:

```ts
const a = { status: 'Open' };
const b = a;
b.status = 'Closed';
console.log(a.status); // 'Closed' 😱 — це той самий об'єкт
```

Копія з **оновленою** властивістю через spread:

```ts
const bug = { id: 1, title: 'Crash', status: 'Open' };
const closed = { ...bug, status: 'Closed' }; // нова властивість перезаписує стару

bug.status;    // 'Open' — оригінал не змінився
closed.status; // 'Closed'
```

> [!QA]
> Незмінні оновлення (`{ ...obj, field: value }`) захищають тестові дані від випадкових змін між тестами. Ту саму ідею ти побачиш у Playwright: базовий об'єкт користувача і на кожен тест — копія з потрібними змінами (`{ ...validUser, email: '' }` для негативного сценарію).

## Порівняння об'єктів

```ts
{ a: 1 } === { a: 1 }; // false: різні об'єкти
```

Щоб порівняти вміст, перевіряй властивості. У тестах для цього є `toEqual`: він порівнює глибоко.

## JSON коротко

Відповіді API приходять у форматі **JSON**, який дуже схожий на об'єктний літерал:

```json
{ "id": 1, "title": "Crash", "tags": ["ui", "login"] }
```

`JSON.parse(text)` перетворює JSON-рядок на об'єкт, `JSON.stringify(obj)` — навпаки. Детально про це в модулі про HTTP та API.

## Підсумок

- Об'єкт — набір властивостей `ключ: значення`; доступ через `.` або `['key']`.
- Тип об'єкта: `{ name: string; age: number }`, або іменований через `type`.
- `?` — необов'язкова властивість.
- Масиви об'єктів — основна форма даних в API і тестах.
- `Object.keys / values / entries` — перебір властивостей.
- Оновлюй без мутацій: `{ ...obj, field: newValue }`.
