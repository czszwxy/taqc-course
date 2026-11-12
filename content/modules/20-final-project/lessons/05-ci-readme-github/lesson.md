# CI, README і публікація на GitHub

Останній крок — зробити роботу **видимою**. Спершу ти збираєш регресійний набір для Checkout (практика уроку). Потім переносиш свій підхід у **власний репозиторій**, налаштовуєш CI, пишеш README і публікуєш проєкт. Саме посилання на цей репозиторій ти поставиш у резюме, LinkedIn і супровідні листи.

## Який застосунок тестувати в публічному репозиторії

Gadgetly Checkout працює лише всередині QA Academy на твоєму комп'ютері — GitHub Actions до нього не дістанеться. Для зеленого CI потрібен **публічний навчальний застосунок**:

| Варіант | Що є | Для чого |
|---|---|---|
| **Toolshop** — practicesoftwaretesting.com | інтернет-магазин інструментів: каталог, пошук, кошик, оформлення, акаунт; **REST API** (api.practicesoftwaretesting.com) зі **Swagger** | рекомендовано: UI + API, як у фінальному проєкті |
| TodoMVC від Playwright — demo.playwright.dev/todomvc | простий список задач | запасний варіант для невеликого UI-репозиторію |

> [!WARNING]
> Це спільні публічні сервіси. Не запускай навантажувальні тести і великі цикли, тримай набір невеликим (15–30 тестів), не створюй тисячі записів і прибирай за собою. Публічний сайт може змінитися — тоді оновиш локатори, це теж частина роботи.

Документацію з Gadgetly (план, чекліст, таблиця рішень, тест-кейси, баг-репорти) можна покласти в `docs/gadgetly-checkout/` як зразок своєї роботи. Для Toolshop зроби коротшу версію: план на сторінку, чекліст і кілька тест-кейсів.

## Мінімальний обсяг портфоліо-репозиторію

- `docs/`: тест-план, чекліст, 3–5 тест-кейсів, знайдені проблеми (якщо є);
- 10–20 UI-тестів з Page Objects і фікстурами;
- 5–10 API-тестів з клієнтом і data-driven випадками;
- CI на кожен push / PR з HTML-звітом як артефактом;
- README з бейджем, інструкцією запуску і описом підходу.

## Конфіг для CI

```ts
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://practicesoftwaretesting.com',
    trace: 'on-first-retry',
  },
});
```

## Workflow GitHub Actions

```yaml
name: Playwright tests
on:
  push:
    branches: [main]
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
```

Бейдж для README: `![Playwright tests](https://github.com/<you>/<repo>/actions/workflows/playwright.yml/badge.svg)`.

## README, який читають

```text
# Toolshop test automation
![Playwright tests](…badge…)
UI + API tests for the Toolshop demo shop — TypeScript, Playwright, GitHub Actions.

## What is tested        (areas + why: risks, API vs UI split)
## Tech stack
## Project structure     (pages/, api/, fixtures/, tests/, docs/)
## How to run            (npm ci · npx playwright install · npm test · show-report)
## Test documentation    (links to docs/)
## CI                    (when it runs, where the report is)
## Known issues / next steps
```

## Публікація: порядок дій

1. Створи репозиторій на GitHub (публічний), додай `.gitignore`.
2. Закоміть і запуш код осмисленими комітами.
3. Переконайся, що workflow у вкладці **Actions** зелений; відкрий артефакт зі звітом.
4. Додай бейдж і README.
5. Склонуй репозиторій у нову папку і пройди README як новий користувач.
6. Закріпи (pin) репозиторій у профілі, додай посилання в резюме і LinkedIn.

> [!QA]
> Фінальна перевірка — очима рев'юера: чи зрозуміло за 30 секунд, що тестується і як запустити? Чи зелений CI? Чи немає секретів, `node_modules`, закоментованого коду і тестів, що залежать один від одного? Завдання «Final review» цього уроку зібране саме з таких пунктів — пройди його і попроси Claude прорецензувати репозиторій.

## Підсумок

- Практика: регресійний набір Checkout, що ловить 8 дефектів UI та API.
- Портфоліо: власний репозиторій на публічному застосунку (Toolshop: UI + API) з тією ж архітектурою.
- CI: GitHub Actions на push/PR, Chromium, HTML-звіт як артефакт, retries лише на CI.
- README з бейджем, структурою, запуском і підходом; документація в `docs/`.
- Публікація: зелений CI → перевірка «з нуля» → pin → резюме і LinkedIn.
