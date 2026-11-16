# Час, мережа й пристрій у тестах

Деякі вимоги неможливо перевірити «чесно»: сесія завершується через 15 хвилин бездіяльності, банер зникає через 5 секунд, сайт показує найближчий магазин, а без інтернету — попередження. Чекати 15 хвилин у тесті не можна, їхати в інше місто — теж. Playwright дозволяє **керувати** часом, мережею й «пристроєм» браузера.

> [!QA]
> Баги, пов'язані з часом і середовищем, — класика продакшну: «о 00:00 зламалось», «у користувачів з Канади інша дата», «без мережі кнопка працює і губить замовлення». Той, хто вміє це автоматизувати, знаходить дефекти, яких не бачить ніхто інший.

## Фальшивий годинник: page.clock

```ts
test('session warning appears after 14 minutes of inactivity', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-05-10T09:00:00Z') });
  await page.goto('/dashboard');

  await page.clock.pauseAt(new Date('2026-05-10T09:13:59Z'));
  await expect(page.getByRole('dialog', { name: 'Are you still there?' })).toHaveCount(0);

  await page.clock.fastForward('00:01');
  await expect(page.getByRole('dialog', { name: 'Are you still there?' })).toBeVisible();
});
```

| Метод | Що робить |
|---|---|
| `clock.install({ time })` | підміняє `Date`, `setTimeout`, `setInterval` тощо; час **іде далі** від заданого моменту |
| `clock.pauseAt(time)` | перестрибує до моменту і **зупиняє** час |
| `clock.fastForward('05:00')` | стрибок уперед («закрив ноутбук — відкрив за 5 хвилин»); таймери, чий час настав, спрацьовують один раз |
| `clock.runFor(2000)` | «проживає» інтервал, запускаючи всі таймери по дорозі |
| `clock.resume()` | час знову йде сам |
| `clock.setFixedTime(time)` | лише фіксує `Date.now()`; таймери працюють як звичайно |

Тривалість — мілісекунди (`5000`) або рядок `'mm:ss'` / `'hh:mm:ss'`.

## Розбір: чому саме install → goto → pauseAt

| Крок | Що відбувається з часом |
|---|---|
| `install({ time: 09:00:00 })` | сторінка думатиме, що зараз 09:00:00; час тече |
| `goto(...)` | сторінка завантажується і запускає свої таймери вже за фальшивим годинником |
| `pauseAt(09:13:59)` | стрибок і зупинка: тепер нічого не зміниться, поки ти не скажеш |
| перевірка | стан стабільний — немає «іноді 09:13:59, іноді 09:14:00» |
| `fastForward('00:01')` | рівно секунда вперед — і наступна перевірка |

- `install` викликай **до** `goto` і до будь-яких інших методів годинника.
- `pauseAt` приймає лише момент **у майбутньому** відносно фальшивого часу: після `install` час уже тече, тож пауза «на ту саму секунду» дасть помилку `Cannot fast-forward to the past`.
- Якщо треба лише «сьогодні 1 січня» без керування таймерами — досить `setFixedTime`.

## Мережа: офлайн

```ts
test('draft is kept while offline', async ({ page, context }) => {
  await page.goto('/notes');
  await context.setOffline(true);
  await page.getByLabel('Note').fill('Call the supplier');
  await expect(page.getByText('Saved locally')).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText('Synced')).toBeVisible();
});
```

`context.setOffline(true)` вимикає мережу для всього контексту: браузер отримує подію `offline`, а запити падають. Це перевірка поведінки **застосунку** без мережі; для окремих відповідей (500, повільно) є `page.route`.

## Геолокація й дозволи

```ts
test.describe('with location', () => {
  test.use({
    geolocation: { latitude: 50.45, longitude: 30.52 },
    permissions: ['geolocation'],
  });

  test('shows the weather for the current city', async ({ page }) => {
    await page.goto('/weather');
    await expect(page.getByRole('heading', { name: 'Kyiv' })).toBeVisible();
  });
});
```

Без `permissions: ['geolocation']` браузер **відмовляє** сторінці в доступі — це готовий негативний сценарій «користувач заборонив геолокацію». Змінити координати посеред тесту можна через `context.setGeolocation(...)`.

## Часовий пояс, локаль, тема

| Опція | Приклад | На що впливає |
|---|---|---|
| `timezoneId` | `'Europe/Kyiv'`, `'America/New_York'` | `new Date()`, `Intl` — показ часу |
| `locale` | `'uk-UA'`, `'en-US'` | `navigator.language`, формат дат і чисел |
| `colorScheme` | `'dark'` | `prefers-color-scheme` |
| `viewport` | `{ width: 375, height: 812 }` | розмір вікна |

Часовий пояс особливо цінно поєднувати з годинником: «о 12:00 UTC у Києві має бути 14:00».

## Де задавати налаштування

| Місце | Діє на |
|---|---|
| `test.use({...})` у файлі або `describe` | тести цього файлу / блоку |
| `projects` у `playwright.config.ts` | цілий прогін: наприклад, проєкти «desktop» і «mobile» |
| `browser.newContext({...})` у тесті | один додатковий контекст (другий користувач, інша країна) |

> [!NOTE]
> Готові описи пристроїв (`devices['Pixel 7']`) задають одразу viewport, user agent, touch. У лабораторії курсу user agent зайнятий службовою позначкою перевірки, тому в завданнях задавай `viewport`, `timezoneId`, `geolocation` окремо, а `devices[...]` використовуй у власному проєкті.

## Типові помилки

- Справжнє очікування `waitForTimeout(5000)`, щоб «дочекатися зникнення» — повільно й нестабільно; керуй годинником.
- `clock.install()` після `goto` — таймери сторінки вже створені за справжнім часом.
- Перевірка часу без `timezoneId` — тест зелений на твоєму ноутбуці й червоний у CI в UTC.
- Геолокація без дозволу — сторінка отримує відмову, а тест «не розуміє чому».
- Забутий `setOffline(false)` у спільному контексті — наступні кроки падають з мережевими помилками.

## Підсумок

- `page.clock`: `install` → `goto` → `pauseAt` → `fastForward` — час під твоїм контролем.
- `context.setOffline(true / false)` — поведінка без мережі.
- `geolocation` + `permissions` — «де користувач» і «чи дозволив».
- `timezoneId`, `locale`, `colorScheme`, `viewport` — середовище користувача.
- Налаштування — через `test.use`, проєкти конфігурації або окремий контекст.
