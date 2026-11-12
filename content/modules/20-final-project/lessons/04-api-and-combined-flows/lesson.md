# API-тести і комбіновані сценарії

Правила ціни Checkout рахує сервер, тому найточніше і найшвидше перевіряти їх **через API**: сотні комбінацій за секунди, без браузера. А те, що бачить користувач, — через UI, використовуючи API для підготовки даних і перевірки результату. Такий розподіл — ознака зрілого фреймворку.

## API-клієнт

Як Page Object для сторінки, **API-клієнт** ховає деталі запитів:

```ts
export class CheckoutApi {
  constructor(private readonly request: APIRequestContext) {}

  async quote(body: QuoteRequest): Promise<APIResponse> {
    return this.request.post('/api/checkout/quote', { data: body });
  }
  async createOrder(body: OrderRequest): Promise<Order> {
    const response = await this.request.post('/api/checkout/orders', { data: body });
    expect(response.status()).toBe(201);
    return response.json();
  }
  async deleteOrder(id: number, phone: string): Promise<void> {
    await this.request.delete(`/api/checkout/orders/${id}`, { params: { phone } });
  }
}
```

Клієнт віддають тестам фікстурою `api`, а фікстура `order` створює замовлення і видаляє його після тесту.

## Data-driven тести з таблиці рішень

Таблиця рішень з уроку 2 перетворюється на масив випадків і цикл:

```ts
const cases = [
  { name: 'courier below the limit', items: cart(2, 1, 1), delivery: 'courier', fee: 150, discount: 0 },
  { name: 'courier at the limit', items: cart(2, 1, 2), delivery: 'courier', fee: 0, discount: 0 },
  { name: 'WELCOME5 with courier', items: cart(1, 1, 2), delivery: 'courier', promoCode: 'WELCOME5', fee: 150, discount: 275 },
];

for (const c of cases) {
  test(`quote: ${c.name}`, async ({ api }) => {
    const response = await api.quote({ items: c.items, delivery: c.delivery, promoCode: c.promoCode });
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ deliveryFee: c.fee, discount: c.discount });
  });
}
```

Кожен випадок — окремий тест з власною назвою у звіті.

## Що перевіряти у відповіді

- **Статус** (200 / 201 / 400 / 404 / 409 / 422).
- **Значення** (`toMatchObject` — лише важливі поля).
- **Контракт**: поля і типи (`expect(typeof body.total).toBe('number')`), відсутність зайвих чутливих даних.
- **Заголовки**: `Location` після створення.
- **Збереження**: після `POST` → `GET` за id повертає ті самі дані.

## Комбіновані сценарії

| Підхід | Приклад |
|---|---|
| **API → UI** (дані готує API) | створити замовлення запитом → перевірити Track an order у UI |
| **UI → API** (перевірка через API) | оформити замовлення в UI → `GET` за номером → сума і знижка збережені правильно |
| **API для передумов** | замість 10 кліків у формі — один запит |

## Тестові дані в спільному середовищі

Сервер один для всіх тестів, які йдуть **паралельно**. Тому:

- кожен тест створює **свої** дані й адресує їх за **id**;
- прибирає їх після себе (`afterEach` або teardown фікстури);
- не перевіряє глобальні лічильники («замовлень стало 5») і не викликає «reset» для всіх.

> [!WARNING]
> `+` у телефоні в query-рядку перетворюється на пробіл. Передавай параметри через `{ params: { phone } }` — Playwright закодує їх правильно.

> [!QA]
> Коли тест перевіряє безпеку (трекінг з чужим телефоном), перевіряй **і UI, і API**: сторінка може приховувати дані, а сервер — все одно віддавати їх будь-кому.

## Підсумок

- API-клієнт ховає запити; фікстури `api` і `order` дають клієнт і дані з прибиранням.
- Таблиця рішень → data-driven тести через цикл з окремими назвами.
- Перевіряй статус, значення, контракт, заголовки і збереження.
- Комбінуй: API → UI, UI → API, API для передумов.
- Спільне середовище: свої дані, адресація за id, прибирання, без глобальних лічильників.
