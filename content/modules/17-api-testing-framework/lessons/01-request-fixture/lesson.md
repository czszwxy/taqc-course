# API-тести з фікстурою request

У модулі 08 ти тестував Gadgetly API вручну: в API console і Postman. Тепер ті самі перевірки стануть автотестами. Playwright уміє не лише керувати браузером, а й надсилати HTTP-запити напряму, без жодної сторінки.

## Перший API-тест

```ts
import { test, expect } from '@playwright/test';

test('health check answers ok', async ({ request }) => {
  const response = await request.get('/api/health');

  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ status: 'ok' });
});
```

- `request` — вбудована фікстура, клієнт HTTP (`APIRequestContext`). Вона знає `baseURL` з конфігу, тож адреси відносні.
- Браузер не запускається, тому такий тест проходить за мілісекунди.

## Методи і що в них передати

```ts
await request.get('/api/products', { params: { category: 'Phones', limit: 5 } });   // ?category=Phones&limit=5
await request.post('/api/auth/login', { data: { email: 'qa@gadgetly.test', password: 'Test1234' } }); // JSON-тіло
await request.patch(`/api/orders/${id}`, { headers: { Authorization: `Bearer ${token}` }, data: { quantity: 3 } });
await request.put(`/api/orders/${id}`, { headers, data: { productId: 1, quantity: 2 } });
await request.delete(`/api/orders/${id}`, { headers });
```

| Опція | Що це |
|---|---|
| `params` | query-параметри (`?a=1&b=2`) |
| `data` | тіло: об'єкт серіалізується в JSON і ставиться `Content-Type: application/json` |
| `headers` | заголовки запиту, наприклад `Authorization` |
| `form` / `multipart` | тіло як форма або з файлами |
| `failOnStatusCode` | `true` — кидати помилку на 4xx/5xx (за замовчуванням ні) |

## APIResponse

| Метод | Що повертає |
|---|---|
| `response.status()` | код: `200`, `404`… |
| `response.ok()` | `true` для 200–299 |
| `await response.json()` | тіло як об'єкт |
| `await response.text()` | тіло як рядок |
| `response.headers()` | заголовки (назви з **малих** літер) |

> [!WARNING]
> Playwright **не** кидає помилку на 4xx/5xx. Відповідь 500 — звичайний `APIResponse`. Тому статус треба перевіряти явно: `expect(response.status()).toBe(201)`. Без цього тест «пройде» на зламаному API.

## Власний контекст

Якщо потрібні спільні заголовки для групи тестів, створи свій контекст:

```ts
import { request } from '@playwright/test';

const api = await request.newContext({
  baseURL: 'http://localhost:5173',
  extraHTTPHeaders: { Authorization: `Bearer ${token}` },
});
await api.get('/api/orders');
await api.dispose();   // звільнити ресурси
```

Або для всього проєкту: `use: { extraHTTPHeaders: { … } }` у конфігу.

## Чому API-тести так цінують

- **Швидкість**: сотні перевірок за секунди, без браузера.
- **Стабільність**: немає анімацій, верстки, очікувань UI.
- **Точність**: бізнес-правила (знижки, права доступу, валідація) перевіряються на джерелі.
- **Піраміда**: API-рівень — середина піраміди з модуля 15. Тут живе більшість комбінацій даних.

> [!QA]
> Негативні API-тести так само важливі, як позитивні: неправильний пароль → 401, відсутнє поле → 400, чужий ресурс → 403, неіснуючий → 404. Відповідь 500 на некоректний запит — завжди баг: сервер має пояснити клієнту помилку, а не падати.

## Підсумок

- `request` — вбудований HTTP-клієнт з `baseURL`: `get`, `post`, `put`, `patch`, `delete`.
- `params` задає query-рядок, `data` — JSON-тіло, `headers` — заголовки.
- `APIResponse` дає `status()`, `ok()`, `json()`, `text()`, `headers()`.
- Playwright не падає на 4xx/5xx сам, тож статус треба перевіряти явно.
- API-тести швидкі й стабільні. Перевіряй і позитивні, і негативні сценарії.
