# UI-фреймворк: Page Object і фікстури

Документація готова, баги знайдено — час автоматизувати. Фреймворк фінального проєкту має бути таким, щоб його було **не соромно показати**: зрозуміла структура, тести як сценарії, жодних пауз і копіпасту. Рекрутер відкриє репозиторій і за 30 секунд має зрозуміти, де що лежить.

## Структура репозиторію

```text
checkout-tests/
├─ pages/                 # Page Objects
│  ├─ checkout-page.ts
│  └─ components/cart-row.ts
├─ api/                   # API-клієнти (урок 4)
│  └─ checkout-api.ts
├─ fixtures/
│  └─ test.ts             # base.extend<…>: checkout, customer, api, cleanup
├─ data/
│  └─ customers.ts        # тестові дані і білдери
├─ tests/
│  ├─ ui/                 # cart.spec.ts, delivery.spec.ts, order.spec.ts
│  └─ api/                # quote.spec.ts, orders.spec.ts
├─ docs/                  # план, чекліст, тест-кейси, баги
├─ playwright.config.ts
└─ README.md
```

Тести імпортують `test` і `expect` **з `fixtures/test.ts`**, а не з `@playwright/test` — так кожен тест має доступ до твоїх фікстур.

## Правила для Page Objects

| Правило | Чому |
|---|---|
| Локатори — у конструкторі або як методи, user-facing (`getByRole`, `getByLabel`) | одне місце для змін верстки |
| Методи — **дії користувача**: `chooseDelivery('Courier')`, `applyPromo('WELCOME5')` | тест читається як сценарій |
| Перевірки (`expect`) — у тестах; у PO лише «очікування стану» (`open()` чекає, поки сторінка готова) | PO не вирішує, що правильно |
| Повторювані частини — **компоненти** (`CartRow` з `increase()`, `quantity`) | менше дублювання |
| Методи повертають локатори для перевірок: `checkout.quantity(103)` | тест сам обирає перевірку |
| Без `waitForTimeout`, без `force`, без CSS-шляхів | стабільність |

```ts
export class CheckoutPage {
  readonly total: Locator;
  constructor(readonly page: Page) {
    this.total = page.getByTestId('summary-total');
  }
  async chooseDelivery(method: Delivery): Promise<void> {
    await this.page.getByRole('radio', { name: new RegExp(`^${method}`) }).check();
  }
}
```

> [!TIP]
> Слідкуй за **strict mode**: на сторінці є і «Phone», і «Phone used at checkout». `getByLabel('Phone')` знайде обидва — уточни `{ exact: true }` або шукай усередині секції: `page.getByRole('region', { name: 'Track an order' }).getByLabel(...)`.

## Фікстури

Фікстура дає тесту готовий ресурс і прибирає за ним:

```ts
type Fixtures = { checkout: CheckoutPage; customer: Customer };

export const test = base.extend<Fixtures>({
  customer: async ({}, use) => {
    await use({ name: 'Olena Tester', phone: '+380671234567', city: 'Kyiv', address: 'Post office 12' });
  },
  checkout: async ({ page }, use) => {
    const checkout = new CheckoutPage(page);
    await checkout.open();
    await use(checkout);          // ← тут виконується тест
    // після use — teardown (прибирання)
  },
});
```

- **Скоуп** `test` (за замовчуванням) — новий екземпляр для кожного тесту; `worker` — один на воркер (дорогі ресурси).
- Фікстура, що **створює дані**, має їх і **видаляти** після `use` — так тести незалежні.
- Фікстури можуть залежати одна від одної: `order` використовує `api` і `customer`.

## Тестові дані

- Константи для стабільних даних (`CUSTOMER`, ціни каталогу).
- **Білдери** для варіацій: `customer({ phone: '+38067123456' })` → валідний клієнт з однією зміною.
- Очікувані суми бери з вимог (5 500 → 5 570), а не зі сторінки: інакше тест «підтвердить» баг.

## Конфіг і запуск

```ts
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:5173', trace: 'on-first-retry' },
});
```

Теги в назвах (`@smoke`) дозволяють запускати підмножину: `npx playwright test --grep @smoke`.

> [!QA]
> Практика цього уроку — два кроки фреймворку для Checkout. Кожен перевіряється на версіях сторінки з **одним** увімкненим дефектом: тест має бути зеленим на правильній версії і червоним на кожній зламаній. Саме так працює регресійний набір на реальному проєкті.

## Підсумок

- Структура: `pages/`, `api/`, `fixtures/`, `data/`, `tests/ui`, `tests/api`, `docs/`.
- Page Object: user-facing локатори, дії користувача, перевірки в тестах, компоненти для повторів.
- Фікстури: готові ресурси + прибирання; скоупи `test` і `worker`; тести імпортують `test` з фікстур.
- Дані: константи й білдери; очікування — з вимог, а не зі сторінки.
