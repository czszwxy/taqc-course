# Ручне тестування API в Postman

**Postman** — найпопулярніший інструмент для ручного тестування API. Його згадують майже у кожній вакансії QA. Він безкоштовний для особистого використання.

> [!NOTE]
> Для нашого локального API (`http://localhost:5173/api`) потрібна **десктопна** версія Postman: веб-версія не бачить твій комп'ютер. Не хочеш нічого встановлювати — усе з цього уроку можна зробити в [API console](/playground/api) або командою `curl`.

## Перший запит

1. **New → HTTP Request**.
2. Метод `GET`, URL `http://localhost:5173/api/products?page=1&limit=5` → **Send**.
3. Унизу — статус, час, розмір, **Body** (Pretty JSON) і **Headers** відповіді.

Для POST: вкладка **Body → raw → JSON**, Postman сам додасть `Content-Type: application/json`.

## Колекції

**Collection** — папка з запитами, наприклад «Gadgetly API»: Health, Login, Products, Orders. Колекцію можна зберегти, поділитися з командою, експортувати у файл і запускати цілком.

## Змінні та оточення

Щоб не копіювати адресу й токен у кожен запит, використовують **змінні**:

```text
Environment "Gadgetly local":
  baseUrl = http://localhost:5173/api
  token   = (set automatically after login)

Request URL:     {{baseUrl}}/orders
Authorization:   Bearer Token → {{token}}
```

**Environment** (оточення) — набір значень для одного середовища: local, staging, production. Перемкнув оточення — усі запити пішли на інший сервер.

## Тести в Postman

Вкладка **Scripts → Post-response** — JavaScript, що виконується після відповіді:

```text
pm.test("Status is 200", () => {
  pm.response.to.have.status(200);
});

pm.test("Token is returned", () => {
  const body = pm.response.json();
  pm.expect(body.token).to.be.a("string");
  pm.environment.set("token", body.token);   // save for the next requests
});
```

**Collection Runner** проганяє всі запити колекції по черзі й показує, які тести пройшли — це перший крок до автоматизації. Повноцінні API-автотести на TypeScript і Playwright ти писатимеш у модулі 17.

## curl — те саме в терміналі

```bash
curl http://localhost:5173/api/health
curl -X POST http://localhost:5173/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"qa@gadgetly.test\",\"password\":\"Test1234\"}"
```

> [!TIP]
> У DevTools → Network: правий клік на запиті → **Copy as cURL**. А в Postman: **Import → Raw text** → встав cURL — і запит з'явиться в Postman з усіма заголовками.

## Інші інструменти

Insomnia, Bruno, Thunder Client і REST Client (розширення VS Code), Swagger UI (документація API з кнопкою «Try it out»). Принципи однакові: метод, URL, заголовки, тіло, відповідь.

## Підсумок

- Postman: запит → колекція → оточення зі змінними `{{baseUrl}}`, `{{token}}`.
- Тести в Scripts: `pm.test`, `pm.expect`, збереження токена у змінну.
- Collection Runner проганяє колекцію цілком.
- curl і Copy as cURL — швидкий спосіб повторити або передати запит.
