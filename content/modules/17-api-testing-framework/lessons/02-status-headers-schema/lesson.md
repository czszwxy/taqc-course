# Статуси, заголовки й схема відповіді

«Повертає 200» — це ще не перевірка. Фронтенд і мобільні застосунки покладаються на **контракт** API: які коди, які заголовки, які поля і якого типу. Тест контракту ловить зміну, яка зламала б клієнтів, ще до релізу.

## Статус-коди: і щасливі, і нещасливі

| Сценарій | Очікуваний код |
|---|---|
| прочитати | 200 |
| створити | **201** (+ заголовок `Location`) |
| видалити | **204** (порожнє тіло) |
| некоректні дані / відсутнє поле | **400** |
| немає токена / неправильний токен | **401** |
| чужий ресурс | **403** |
| не існує | **404** |
| конфлікт (немає в наявності, дубль) | **409** |

> [!QA]
> 200 замість 403 на чуже замовлення — це не дрібниця, а витік даних іншого клієнта. Тести прав доступу — одні з найцінніших в API-наборі.

## Заголовки

```ts
expect(response.headers()['content-type']).toContain('application/json');
expect(response.headers()['location']).toMatch(/\/orders\/\d+$/);
expect(response.headers()['www-authenticate']).toBe('Bearer');
expect(response.headers()['x-request-id']).toBeTruthy();
```

## Форма відповіді і типи

```ts
const body = await response.json();

// частина полів з конкретними значеннями
expect(body).toMatchObject({ page: 1, limit: 10, total: 14 });

// ТОЧНИЙ набір полів і їх типи (зайве або відсутнє поле — падіння)
expect(body.items[0]).toEqual({
  id: expect.any(Number),
  name: expect.any(String),
  category: expect.any(String),
  price: expect.any(Number),
  rating: expect.any(Number),
  inStock: expect.any(Boolean),
});
```

| Матчер | Коли |
|---|---|
| `toEqual` | точна структура (усі поля) |
| `toMatchObject` | лише потрібні поля, решта ігнорується |
| `expect.any(Number)` | «будь-яке число» |
| `expect.stringMatching(/…/)` | рядок за шаблоном (дата, email) |
| `expect.arrayContaining([...])` | масив містить ці елементи |
| `toHaveLength(n)` | довжина масиву |

## Колекції і пагінація

- кожен елемент відповідає фільтру (`for (const item of body.items) expect(item.category).toBe('Phones')`);
- `total` збігається з реальною кількістю;
- сторінки **не перетинаються** і не пропускають елементи;
- межі: `limit` на максимумі (50 → 200, 51 → 400), порожня сторінка після останньої.

## Схеми

Для великих API замість ручних `toEqual` описують **схему** відповіді й перевіряють нею. Наприклад, у форматі JSON Schema (бібліотека Ajv) або в TypeScript-бібліотеці zod (її використовує й сам QA Academy):

```ts
import { z } from 'zod';

const Product = z.object({ id: z.number(), name: z.string(), price: z.number().positive(), inStock: z.boolean() });
const result = Product.array().safeParse(body.items);
expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
```

Часто схеми генерують з документації API (OpenAPI/Swagger). Тоді тест контракту автоматично стежить за документацією.

> [!TIP]
> Помилки теж мають контракт: `{ "error": "…" }` з зрозумілим текстом і правильним кодом. Перевіряй їх так само ретельно, як успішні відповіді: клієнт показує цей текст користувачеві.

## Підсумок

- Контракт = статус-коди + заголовки + структура тіла + типи полів + формат помилок.
- Для кожної операції свої коди: 200 / 201 / 204 / 400 / 401 / 403 / 404 / 409.
- `toEqual` з `expect.any(...)` перевіряє набір полів і типи, `toMatchObject` — лише потрібні поля.
- Колекції: фільтр, `total`, сторінки без перетинів, межі `limit`.
- Великі API перевіряють схемами (JSON Schema + Ajv, zod).
