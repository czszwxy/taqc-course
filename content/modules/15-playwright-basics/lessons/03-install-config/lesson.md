# Встановлення Playwright, структура проєкту, конфіг

## Новий проєкт за одну команду

Потрібен Node.js (модуль 09). Далі в порожній папці:

```bash
npm init playwright@latest
```

Майстер поставить кілька питань: TypeScript чи JavaScript, назва папки з тестами (`tests`), чи додати workflow для GitHub Actions, чи встановити браузери. Після цього в папці з'являться:

```text
my-tests/
├─ tests/
│  └─ example.spec.ts        ← приклад тесту
├─ playwright.config.ts      ← налаштування
├─ package.json              ← @playwright/test у devDependencies
├─ package-lock.json
└─ .github/workflows/playwright.yml   ← (якщо обрав) запуск у CI
```

Тести — це файли `*.spec.ts` (або `*.test.ts`) у папці тестів.

## Браузери

Playwright працює з **власними збірками** браузерів (Chromium, Firefox, WebKit) і завантажує їх окремою командою:

```bash
npx playwright install            # усі три
npx playwright install chromium   # лише Chromium (швидше, менше місця)
```

> [!TIP]
> Помилка `Executable doesn't exist … Looks like Playwright was just installed or updated. Please run npx playwright install` означає, що браузери не завантажені, або оновився пакет і йому потрібна нова версія браузера. Виконай `npx playwright install`.

## Перший запуск

```bash
npx playwright test          # усі тести
npx playwright show-report   # HTML-звіт останнього прогону
```

## playwright.config.ts

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',             // де шукати тести
  timeout: 30_000,                // ліміт на ОДИН тест (за замовчуванням 30 с)
  expect: { timeout: 5_000 },     // скільки чекає перевірка expect (за замовчуванням 5 с)
  fullyParallel: true,            // паралельно навіть тести в одному файлі
  retries: process.env.CI ? 2 : 0,// повтори впалих тестів (часто лише на CI)
  workers: process.env.CI ? 1 : undefined, // кількість паралельних процесів
  reporter: 'html',               // формат звіту
  use: {
    baseURL: 'http://localhost:3000', // тоді page.goto('/login')
    trace: 'on-first-retry',          // записувати trace при повторі
    screenshot: 'only-on-failure',
  },
  projects: [                     // на чому запускати
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {                    // запустити застосунок перед тестами
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
```

| Налаштування | Що робить |
|---|---|
| `testDir` | папка з тестами |
| `timeout` | максимальний час одного тесту |
| `expect.timeout` | скільки web-first перевірка чекає потрібного стану |
| `retries` | скільки разів повторити тест, що впав |
| `workers` | скільки тестів виконується одночасно |
| `use.baseURL` | база для відносних адрес у `page.goto('/…')` |
| `use.trace` / `screenshot` / `video` | що записувати для розбору падінь |
| `projects` | набори налаштувань: браузери, пристрої, середовища |
| `webServer` | команда, яка запускає застосунок перед тестами |

> [!WARNING]
> `retries` не лікує flaky-тести, а лише ховає їх. Вмикай повтори на CI разом із `trace: 'on-first-retry'` і **розбирай** кожен тест, який пройшов лише з повтору (у звіті він позначений як *flaky*).

## Лабораторія цього курсу

У проєкті QA Academy вже є Playwright: папка `lab/` з конфігом `lab/playwright.config.ts`. Його `baseURL` — сам застосунок (`http://localhost:5173`), тож тести відкривають сторінки Bug Playground: `page.goto('/playground/login')`.

Браузер для лабораторії лежить у самому проєкті, у папці `lab/.browsers` (вона в `.gitignore`). Лаунчер QA Academy перевіряє його при кожному старті. Якщо колись знадобиться встановити його вручну (наприклад, після оновлення Playwright), виконай у терміналі в папці проєкту:

```bash
npm run lab:setup
```

Це та сама `npx playwright install chromium`, тільки браузер кладеться в `lab/.browsers`, а не в папку користувача Windows. Конфіг лабораторії шукає його спершу там.

Далі:

- практичні завдання модуля запускаються кнопками **▶ Run** / **✓ Check** прямо на сторінці завдання;
- свої експерименти клади в `lab/tests/` і запускай `npm run lab` (там уже є `example.spec.ts`).

> [!QA]
> Конфіг — частина тестового набору, і його теж рев'юють. Таймаути в 2 хвилини «щоб точно встигло» роблять падіння дуже повільними. А `retries: 5` перетворює CI на лотерею. Розумні значення та trace на повторі краще за «чарівні» великі числа.

## Підсумок

- `npm init playwright@latest` створює проєкт: `tests/`, `playwright.config.ts`, `package.json`.
- Браузери завантажуються окремо: `npx playwright install` (або лише `chromium`).
- `npx playwright test` запускає тести, `npx playwright show-report` відкриває звіт.
- Головне в конфігу: `testDir`, `timeout`, `expect.timeout`, `retries`, `workers`, `use.baseURL`, `trace`, `projects`, `webServer`.
- У цьому курсі тести лабораторії лежать у `lab/`, запуск — `npm run lab` або кнопки на сторінці завдання.
