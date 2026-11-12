# Фікстури: вбудовані й власні

Ти користуєшся фікстурами з першого тесту: `async ({ page }) => …`. **Фікстура** — це «річ, яку тест отримує готовою»: підготовлена перед тестом і прибрана після. Playwright створює лише ті фікстури, які тест **попросив** у параметрах.

## Вбудовані фікстури

| Фікстура | Що це |
|---|---|
| `page` | нова вкладка в окремому контексті для кожного тесту |
| `context` | браузерний контекст цього тесту (cookies, storage, кілька вкладок) |
| `browser` | спільний браузер воркера (`browser.newContext()`) |
| `request` | API-клієнт з `baseURL` (уроки 7, 8 і модуль 17) |
| `browserName` | `'chromium'`, `'firefox'` або `'webkit'` |

## Власна фікстура

```ts
import { test as base, expect } from '@playwright/test';
import { CartPage } from './pages/CartPage';

type Fixtures = { cart: CartPage };

export const test = base.extend<Fixtures>({
  cart: async ({ page }, use) => {
    const cart = new CartPage(page);   // підготовка
    await cart.goto();
    await use(cart);                   // ← тут виконується тест
    // прибирання (після тесту), наприклад видалити створені дані
  },
});

test('promo code works', async ({ cart }) => {
  await cart.applyPromo('SAVE10');
  await expect(cart.discount).toContainText('250 UAH');
});
```

- Код **до** `await use(value)` — це setup, **після** — teardown. Teardown виконується, навіть якщо тест упав.
- Фікстури можуть залежати від інших: `cart: async ({ page }, use) => …` залежить від `page`. Playwright створює їх у правильному порядку.
- Тест отримує лише те, що попросив: `async ({ cart })` не створить, наприклад, `request`.

## Фікстура-«спостерігач»

```ts
consoleErrors: async ({ page }, use) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await use(errors);
},
```

Тест вирішує, що з ними робити: `expect(consoleErrors).toEqual([])`. Можна піти далі й зробити фікстуру **автоматичною** (`{ auto: true }`) з перевіркою в teardown. Тоді кожен тест упаде, якщо сторінка писала помилки в консоль.

## Область дії (scope)

- **test** (за замовчуванням): нова для кожного тесту;
- **worker**: одна на воркер, для дорогих речей (наприклад, створити тестового користувача один раз): `[async ({}, use) => { … }, { scope: 'worker' }]`.

## Фікстури vs хуки

| `beforeEach` | Фікстура |
|---|---|
| виконується для всіх тестів групи | лише для тестів, які її попросили |
| дані передаються через змінні | значення приходить параметром |
| прибирання в окремому `afterEach` | setup і teardown в одному місці |
| у межах файлу | перевикористовується в усьому проєкті (`fixtures/index.ts`) |

> [!QA]
> Фікстури — серце фреймворку автотестів. Типовий набір у реальному проєкті: Page Objects, авторизований користувач, API-клієнт, тестові дані, які створюються й видаляються. Добре, коли тест читається так: `test('…', async ({ signedInUser, cartPage }) => …)` — одразу видно, що йому потрібно.

## Підсумок

- Фікстура — готова до використання річ у параметрах тесту. `page`, `context`, `browser` і `request` вбудовані.
- Власні фікстури створює `base.extend<Types>({ name: async ({ deps }, use) => { setup; await use(value); teardown } })`.
- Teardown після `use` виконується навіть при падінні тесту. Залежності задаються параметрами.
- Scope `test` (за замовчуванням) або `worker`. Також бувають auto-фікстури.
- Фікстури замінюють хуки там, де потрібне перевикористання й прибирання.
