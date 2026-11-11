# fetch і типізація відповідей API

У модулі 08 ти надсилала запити руками — через API console і Postman. Тепер — з коду. `fetch` — вбудована функція для HTTP-запитів у браузері та Node.js. Playwright має свій клієнт (`request`), але принципи ті самі: запит → перевірка статусу → розбір JSON → перевірка даних.

> [!NOTE]
> У завданнях цього уроку `fetch` працює **офлайн**: він «розмовляє» з навчальною копією Gadgetly API за адресою `https://api.gadgetly.test` (ті самі товари й тестовий користувач `qa@gadgetly.test` / `Test1234`). Справжня мережа не потрібна.

## GET

```ts
const response = await fetch('https://api.gadgetly.test/api/products/1');
response.status;    // 200
response.ok;        // true for 200–299
const product = await response.json();   // parse the JSON body (it is async too!)
```

> [!WARNING]
> `fetch` **не** кидає помилку на 404 чи 500 — для нього це успішно отримана відповідь. Помилку він кидає лише коли запит взагалі не дійшов (немає мережі, неправильний хост). Тому `response.ok` треба перевіряти **самостійно**.

```ts
async function getProduct(id: number): Promise<Product> {
  const response = await fetch(`${BASE_URL}/api/products/${id}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as Product;
}
```

## POST з JSON

```ts
const response = await fetch(`${BASE_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'qa@gadgetly.test', password: 'Test1234' }),
});
const { token } = (await response.json()) as { token: string };
```

Заголовок `Authorization` для захищених ендпоінтів:

```ts
await fetch(`${BASE_URL}/api/orders`, { headers: { Authorization: `Bearer ${token}` } });
```

## Типізація відповіді: as чи guard

`response.json()` повертає `Promise<any>`. Два підходи:

| | `as Product` | type guard `isProduct(data)` |
|---|---|---|
| Що робить | «повір мені, компіляторе» | реально перевіряє дані |
| Якщо сервер повернув інше | помилка пізніше, у несподіваному місці | помилка одразу, з зрозумілим повідомленням |
| Коли | свій надійний сервіс, швидкий скрипт | **тести**: перевірка форми відповіді — і є мета |

```ts
async function getJson<T>(url: string, isT: (v: unknown) => v is T): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new HttpError(response.status, `HTTP ${response.status}`);
  const data: unknown = await response.json();
  if (!isT(data)) throw new Error('Unexpected response shape');
  return data;
}
```

> [!QA]
> API-тест на TypeScript — це саме такий код плюс `expect`: перевірити статус, заголовки, форму і значення. У модулі 17 ти напишеш такі тести з Playwright `request` і `expect`.

## Підсумок

- `await fetch(url, { method, headers, body })` → `Response`; `await response.json()` — тіло.
- `fetch` не кидає помилку на 4xx/5xx — перевіряй `response.ok` / `status` сам.
- POST: `Content-Type: application/json` і `body: JSON.stringify(...)`.
- Тип відповіді: `as T` — обіцянка, type guard — перевірка (у тестах краще guard).
