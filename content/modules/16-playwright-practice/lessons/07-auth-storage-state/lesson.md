# Авторизація і storageState

Більшість сторінок, які треба тестувати, доступні лише після входу: кабінет, замовлення, адмінка. Логінитися через форму в кожному з 300 тестів означає зайві хвилини на кожен прогін. Крім того, коли зламається форма логіну, впадуть усі 300 тестів, хоча зламалося одне. Розв'язок — увійти **один раз** і перевикористати стан.

## Що таке storageState

**storageState** — знімок того, що робить браузер «залогіненим»: cookies і localStorage для кожного origin.

```ts
const state = await page.context().storageState();                // об'єкт
await page.context().storageState({ path: 'playwright/.auth/user.json' }); // або файл
```

```json
{
  "cookies": [],
  "origins": [
    { "origin": "http://localhost:5173", "localStorage": [{ "name": "gadgetly:token", "value": "eyJhbGciOi…" }] }
  ]
}
```

Новий контекст з цим станом уже залогінений:

```ts
const context = await browser.newContext({ storageState: 'playwright/.auth/user.json' });
```

## Типова схема: setup-проєкт

```ts
// tests/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

setup('sign in', async ({ page }) => {
  await page.goto('/playground/account');
  await page.getByLabel('Email').fill(process.env.QA_EMAIL!);
  await page.getByLabel('Password').fill(process.env.QA_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
```

```ts
// playwright.config.ts
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
    dependencies: ['setup'],          // спершу setup, потім тести
  },
],
```

Тепер кожен тест проєкту `chromium` стартує вже залогіненим. Для окремого файлу чи групи стан можна змінити: `test.use({ storageState: 'playwright/.auth/admin.json' })` для адміна, або `test.use({ storageState: { cookies: [], origins: [] } })` для гостя.

## Логін через API

Ще швидше отримати сесію без браузера:

```ts
const response = await request.post('/api/auth/login', { data: { email, password } });
const { token } = await response.json();
```

Далі токен кладуть у storageState (як localStorage або cookie, залежно від того, де його тримає застосунок).

> [!WARNING]
> Файли `.auth/*.json` містять **живі сесії**. Додай `playwright/.auth` у `.gitignore`. Паролі тестових акаунтів беруться зі змінних середовища або секретів CI, а не з коду (модуль 09).

## А сам логін?

storageState **пропускає** форму входу, тому логін, вихід і сесію тестують **окремими** тестами:

- вхід з правильними й неправильними даними;
- сесія переживає перезавантаження сторінки;
- **вихід** справді видаляє сесію: після reload ти все ще не в акаунті;
- прострочений або підроблений токен → знову форма входу.

> [!QA]
> «Вихід, після якого достатньо оновити сторінку, щоб знову бути в акаунті» — реальний і небезпечний баг: на спільному комп'ютері наступна людина побачить чужий кабінет. Автотест на це — 5 рядків: sign out → reload → перевірити форму входу.

## Підсумок

- storageState — cookies + localStorage. Зберігається через `context.storageState({ path })`, використовується через `newContext({ storageState })` або `test.use`.
- Типова схема: setup-проєкт логіниться один раз, решта проєктів залежить від нього (`dependencies`).
- Логін через API (`request.post`) ще швидший за UI.
- Файли сесій і паролі не комітимо.
- Логін, вихід і сесію все одно тестуємо окремо.
