# API + UI разом

UI-тест «замовлення видно в кабінеті», зроблений чесно через інтерфейс, мав би: зареєструватися, увійти, знайти товар, додати в кошик, оплатити й лише потім перевірити кабінет. Це хвилина часу і десяток місць, де тест може впасти **не через те, що він перевіряє**. Комбінований тест готує все через API і використовує UI лише для того, що справді тестується.

## Напрям 1: API готує → UI перевіряє

```ts
test('an order created through the API is shown in the account', async ({ page, request }) => {
  // 1. логін і дані через API — мілісекунди
  const token = (await (await request.post('/api/auth/login', { data: USER })).json()).token;
  const headers = { Authorization: `Bearer ${token}` };
  const order = await (await request.post('/api/orders', { headers, data: { productId: 1, quantity: 2 } })).json();

  try {
    // 2. у UI — одразу залогінені (токен у localStorage до завантаження сторінки)
    await page.addInitScript((t) => localStorage.setItem('gadgetly:token', t), token);
    await page.goto('/playground/account');

    // 3. перевіряємо саме відображення
    await expect(page.getByTestId(`order-${order.id}`)).toContainText('998 UAH');
  } finally {
    await request.delete(`/api/orders/${order.id}`, { headers });   // 4. прибрали
  }
});
```

`page.addInitScript` виконує код **до** скриптів сторінки при кожному завантаженні. Так сесію кладуть у localStorage. Якщо застосунок тримає сесію в cookie, використовують `context.addCookies(...)` або `storageState` (модуль 16).

## Напрям 2: UI діє → API перевіряє

Умовний приклад для сторінки профілю, яка зберігає налаштування на сервері:

```ts
await page.getByRole('button', { name: 'Save profile' }).click();
await expect(page.getByText('Profile saved')).toBeVisible();

const profile = await (await request.get('/api/me', { headers })).json();
expect(profile).toMatchObject({ language: 'en', newsletter: false });   // збережено те, що треба
```

«UI каже "збережено"» — ще не означає, що збережено правильно. Перевірка через API (або БД, модуль 10) дивиться на сам результат.

## page.request

`page.request` — API-клієнт, що ділить **cookies** з контекстом сторінки. Запит, надісланий ним, іде від імені того самого залогіненого (через cookies) користувача, і навпаки. Зручно, коли сесія в cookies.

## Що куди

| Через API | Через UI |
|---|---|
| логін (крім тестів самого логіну) | те, що перевіряє тест: відображення, взаємодія |
| створення тестових даних | ключові користувацькі сценарії end-to-end (кілька штук) |
| прибирання | |
| перевірка «що насправді збереглося» | |

> [!WARNING]
> Не перетворюй UI-тест на API-тест з одним `goto`. Якщо вимога про **інтерфейс** (кнопка, повідомлення, форма), її треба пройти в UI. API лише прибирає шлях до цієї точки. І залиш кілька справжніх end-to-end тестів без «зрізань»: вони ловлять баги склеювання всього разом.

> [!QA]
> Комбіновані тести ловлять баги на **стику** шарів: API порахував суму неправильно, а UI сумлінно її показав; UI показав «збережено», а API отримав старе значення.

## Підсумок

- API готує дані, логін і прибирання. UI перевіряє лише те, що тестується. Тести швидкі й не падають «не там».
- Сесію в UI передають через `page.addInitScript` (localStorage), `context.addCookies` або `storageState`.
- Зворотний напрям: дія в UI, перевірка результату через API.
- `page.request` ділить cookies зі сторінкою.
- Залиш кілька повних end-to-end сценаріїв без зрізань.
