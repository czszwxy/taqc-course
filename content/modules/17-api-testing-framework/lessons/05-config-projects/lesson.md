# Конфіг: проєкти, браузери, середовища, повтори, паралельність

Той самий набір тестів запускають у різних умовах: локально і на CI, на staging і на dev, у Chrome і Safari, на десктопі й телефоні. Усе це описує один `playwright.config.ts`.

## Projects — браузери і пристрої

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
    { name: 'api', testMatch: /.*\.api\.spec\.ts/ },        // API-тести без браузера
  ],
});
```

```bash
npx playwright test --project=webkit
npx playwright test --project=api
```

`devices[...]` задає розмір екрана, user agent, touch і масштаб, щоб імітувати пристрій.

## Середовища

Адреси й облікові записи **не хардкодять**. Їх беруть зі змінних оточення:

```ts
use: {
  baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
},
```

```bash
BASE_URL=https://staging.gadgetly.test npx playwright test      # bash
$env:BASE_URL="https://staging.gadgetly.test"; npx playwright test  # PowerShell
```

Локально значення зручно тримати у файлі `.env` (пакет `dotenv`), який **не комітять** (модуль 09), а на CI — у секретах.

## Повтори і trace

```ts
retries: process.env.CI ? 2 : 0,
use: { trace: 'on-first-retry', screenshot: 'only-on-failure', video: 'retain-on-failure' },
```

На CI один повтор рятує від випадкового мережевого збою, а `trace` на повторі дає докази для розбору. Тест, що пройшов лише з повтору, звіт позначає як **flaky**. Його треба розібрати, а не забути (модуль 15).

## Паралельність

| Налаштування | Що робить |
|---|---|
| `workers: 4` | 4 процеси одночасно (за замовчуванням — половина ядер) |
| `fullyParallel: true` | паралельно навіть тести всередині одного файлу |
| `test.describe.configure({ mode: 'serial' })` | тести групи по черзі і зупинка після першого падіння (лише для справді залежних кроків) |
| `--shard=1/3` | запустити третину набору: так ділять прогін між кількома машинами CI |

> [!WARNING]
> Паралельність вимагає незалежних тестів і даних (уроки 3–4, модуль 16). Якщо набір «стабільний лише з `workers: 1`», у ньому є прихована залежність. Це борг, який треба виправити.

## Залежні проєкти і глобальне налаштування

```ts
projects: [
  { name: 'setup', testMatch: /global\.setup\.ts/ },                 // логін, підготовка даних
  { name: 'chromium', use: { storageState: '.auth/user.json' }, dependencies: ['setup'] },
],
```

## Запобіжники для CI

```ts
forbidOnly: !!process.env.CI,     // забутий test.only зупинить прогін на CI
reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
```

> [!QA]
> Конфіг — це тестова стратегія в коді: на яких браузерах (за аналітикою користувачів), на яких середовищах, скільки повторів дозволено, що записувати для розбору. Рішення в ньому мають бути свідомими й узгодженими з командою.

## Підсумок

- `projects` запускають ті самі тести в різних браузерах і пристроях, а також окремо API-тести. Вибір: `--project`.
- Середовище задають змінні оточення (`BASE_URL`), `.env` локально, секрети на CI. Нічого не хардкодять.
- `retries` і `trace: 'on-first-retry'` на CI. Flaky-тести розбирають.
- Паралельність: `workers`, `fullyParallel`, `--shard`. Вимагає незалежних тестів.
- `dependencies` для setup, `forbidOnly` на CI.
