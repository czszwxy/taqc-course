# Перехоплення й мокання мережі

UI — це лише половина. Друга половина — запити, які сторінка шле на сервер, і відповіді, які вона отримує (модулі 07–08). Playwright дає і **підглянути** запити, і **підмінити** відповіді.

## Підглянути: waitForRequest / waitForResponse

```ts
const requestPromise = page.waitForRequest((r) => r.url().includes('/lab/profile') && r.method() === 'POST');
await page.getByRole('button', { name: 'Save profile' }).click();
const request = await requestPromise;

expect(request.postDataJSON()).toEqual({ name: 'Olena', newsletter: true, language: 'uk' });
expect(request.headers()['content-type']).toContain('application/json');
```

```ts
const responsePromise = page.waitForResponse('**/api/orders');
await page.goto('/playground/account');
const response = await responsePromise;
expect(response.status()).toBe(200);
```

Пам'ятай патерн з уроку 3: **Promise до дії**.

| Що перевіряти в запиті | Як |
|---|---|
| метод | `request.method()` |
| URL і параметри | `new URL(request.url()).searchParams.get('status')` |
| заголовки | `request.headers()['authorization']` |
| тіло | `request.postDataJSON()` |

## Підмінити: page.route

```ts
await page.route('**/api/orders', (route) =>
  route.fulfill({ status: 200, json: { items: [{ id: 2001, status: 'paid', quantity: 3 }] } }),
);
```

| Метод маршруту | Що робить |
|---|---|
| `route.fulfill({ status, json, body, headers })` | віддати свою відповідь, сервер не викликається |
| `route.abort()` | обірвати запит (як «немає мережі») |
| `route.continue({ headers, postData })` | пропустити на сервер, можна змінивши запит |
| `route.fetch()` + `fulfill({ response, json })` | взяти справжню відповідь і змінити її |

Маршрут треба зареєструвати **до** того, як сторінка зробить запит, тобто зазвичай до `goto` або до дії.

```ts
// справжня відповідь, але з додатковим замовленням
await page.route('**/api/orders', async (route) => {
  const response = await route.fetch();
  const body = await response.json();
  await route.fulfill({ response, json: { items: [...body.items, { id: 9999, status: 'paid', quantity: 1 }] } });
});
```

## Навіщо моки

- **Рідкісні стани**: порожній список, помилка 500, повільна відповідь, обрив мережі. На справжньому середовищі їх майже не відтворити.
- **Стабільність**: тест не залежить від того, які замовлення сьогодні лежать на сервері.
- **Швидкість** і незалежність від сторонніх сервісів (оплата, карти, аналітика).

> [!WARNING]
> Мок перевіряє **фронтенд**, а не сервер. Якщо API змінить формат відповіді, тест з моком лишиться зеленим, а продакшн зламається. Тому моки поєднують із тестами справжнього API (модуль 17) і кількома end-to-end тестами без моків.

> [!QA]
> Типові баги, які ловлять моки: помилку 500 показано як «немає замовлень» (користувач думає, що в нього нічого немає); кнопка «Спробувати ще» нічого не робить; нескінченний спінер при обриві мережі; список ламається на 0 або 1 елементі. Це ті самі класи еквівалентності з модуля 03, тільки для відповідей сервера.

## Підсумок

- `waitForRequest` / `waitForResponse` дають сам запит чи відповідь: метод, URL, параметри, заголовки, тіло, статус.
- `page.route(url, handler)` перехоплює запити: `fulfill` (своя відповідь), `abort` (обрив), `continue` (змінений запит), `fetch` + `fulfill` (змінена справжня відповідь).
- Маршрут реєструють до запиту, Promise очікування — до дії.
- Моки потрібні для рідкісних станів і стабільності, але не замінюють тести справжнього API.
