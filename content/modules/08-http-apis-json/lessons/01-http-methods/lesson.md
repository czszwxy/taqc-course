# HTTP-запити і методи

**API** (Application Programming Interface) — це «вхід для програм»: сайт, мобільний застосунок і автотести спілкуються з сервером через API, надсилаючи HTTP-запити й отримуючи дані (зазвичай JSON). Тестувати API можна **без інтерфейсу**: швидше, стабільніше й глибше, ніж через UI. Тому API testing — обов'язкова навичка для QA Automation.

Практика — на локальному **Gadgetly API**, яке працює разом із цим застосунком за адресою `http://localhost:5173/api`. Найпростіше надсилати запити через [API console](/playground/api) — міні-Postman у браузері.

## Будова запиту

```text
POST /api/orders HTTP/1.1                    ← method + path (+ query)
Host: localhost:5173                         ← headers
Content-Type: application/json
Authorization: Bearer eyJhbGciOi…

{ "productId": 1, "quantity": 2 }            ← body (not every request has one)
```

## Будова відповіді

```text
HTTP/1.1 201 Created                         ← status code + text
Content-Type: application/json; charset=utf-8
Location: /api/orders/1003                   ← headers
X-Request-Id: req-0042

{ "id": 1003, "productId": 1, "quantity": 2, "total": 998 }   ← body
```

## Методи

| Метод | Для чого | Має body? | Приклад |
|---|---|---|---|
| **GET** | отримати дані | ні | `GET /api/products/3` |
| **POST** | створити новий ресурс / виконати дію | так | `POST /api/orders` |
| **PUT** | **повністю** замінити ресурс | так | `PUT /api/orders/1002` |
| **PATCH** | **частково** змінити ресурс | так | `PATCH /api/orders/1002` з `{ "quantity": 3 }` |
| **DELETE** | видалити | зазвичай ні | `DELETE /api/orders/1002` |

Рідше: `HEAD` (лише заголовки), `OPTIONS` (які методи дозволені).

## Безпечні та ідемпотентні методи

- **Безпечний** (safe) метод нічого не змінює на сервері: `GET`, `HEAD`, `OPTIONS`.
- **Ідемпотентний** метод дає той самий результат, скільки б разів його не повторили: `GET`, `PUT`, `DELETE` (видалити двічі — ресурсу однаково немає).
- **POST не ідемпотентний**: два однакові POST створюють **два** замовлення.

> [!QA]
> Звідси класичні тести: (1) `GET` не повинен нічого змінювати — порівняй дані до і після; (2) повторний `POST` (подвійний клік, повтор після таймауту) не повинен створювати дублікати, якщо так обіцяє вимога; (3) повторний `DELETE` не має повертати 500.

## Перші запити

Відкрий [API console](/playground/api), натискай кнопки-приклади і **Send**:

1. `GET /api/health` — сервер живий?
2. `GET /api/products?page=1&limit=5` — список товарів.
3. `GET /api/products/3` — один товар.
4. `POST /api/auth/login` з email і паролем — отримати токен.

> [!TIP]
> Те саме можна зробити в **Postman** (урок 7) або в терміналі командою `curl http://localhost:5173/api/health`. Сервер API працює, поки запущено QA Academy.

## Підсумок

- Запит = метод + URL + заголовки + (body). Відповідь = статус + заголовки + (body).
- GET — читати, POST — створювати, PUT — замінити, PATCH — змінити частину, DELETE — видалити.
- GET безпечний; GET/PUT/DELETE ідемпотентні; POST — ні.
- API тестують без UI: швидше й глибше.
