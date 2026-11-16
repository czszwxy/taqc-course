# Просунуті інструменти Playwright: кроки, polling, власні матчери

Базових `click`, `fill` і `expect(locator)` вистачає для 80 % тестів. Решта 20 % — довгі сценарії, значення, яких немає на сторінці, і перевірки, що повторюються в десятках тестів. Для них у Playwright є окремі інструменти — саме про них питають на співбесідах на рівень вище junior.

> [!QA]
> Мета цих інструментів одна: коли тест упав, звіт має одразу казати **що саме** пішло не так. «Крок "Оплата": очікували статус paid, отримали created» замість «Timeout 5000ms exceeded».

## test.step — кроки в довгому сценарії

```ts
test('guest can book a table', async ({ page }) => {
  await test.step('Open the booking form', async () => {
    await page.goto('/booking');
    await page.getByRole('button', { name: 'Book a table' }).click();
  });

  await test.step('Fill in the details', async () => {
    await page.getByLabel('Guests').fill('4');
    await page.getByLabel('Date').fill('2026-06-01');
  });

  const code = await test.step('Confirm and read the booking code', async () => {
    await page.getByRole('button', { name: 'Confirm' }).click();
    return page.getByTestId('booking-code').innerText();
  });

  expect(code).toMatch(/^BK-\d{4}$/);
});
```

| Що дає `test.step` | Де видно |
|---|---|
| назви кроків у HTML-звіті й трейсі | звіт читає навіть не програміст |
| упалий крок підсвічено | не треба шукати рядок у стек-трейсі |
| крок може **повернути значення** | як `code` у прикладі |
| кроки вкладаються один в один | великі сценарії діляться на блоки |

Кроки — не заміна окремим тестам: якщо частини сценарію незалежні, це різні тести.

## expect.poll — коли значення не з локатора

`expect(locator)` чекає сам, бо знає, як перечитати елемент. Але значення з API чи з `page.evaluate()` — це вже готове число або рядок, перечитати його нічим. `expect.poll` приймає **функцію** і викликає її знову й знову, поки перевірка не пройде:

```ts
await expect
  .poll(async () => {
    const response = await request.get(`/api/exports/${exportId}`);
    return (await response.json()).status;
  }, { message: 'export should finish', timeout: 10_000 })
  .toBe('ready');
```

| Опція | Значення |
|---|---|
| `timeout` | скільки чекати; типово 5 секунд |
| `intervals` | паузи між спробами; типово `[100, 250, 500, 1000]` мс |
| `message` | текст для звіту, якщо не дочекались |

## expect(...).toPass — повторити цілий блок

Коли повторювати треба не одне значення, а **кілька дій з перевірками**:

```ts
await expect(async () => {
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByTestId('report-status')).toHaveText('Ready');
}).toPass({ timeout: 15_000 });
```

> [!WARNING]
> Типовий `timeout` у `toPass` — **0** (одна спроба), і він не бере таймаут з конфігурації. Завжди вказуй `timeout` явно. І пам'ятай: `toPass` — для справді асинхронних процесів на сервері, а не спосіб «полікувати» нестабільний тест.

## Власні матчери — expect.extend

Якщо та сама перевірка з тим самим форматуванням трапляється в десятках тестів, її виносять у матчер:

```ts
import { expect as baseExpect, type Locator } from '@playwright/test';

export const expect = baseExpect.extend({
  async toHaveUah(locator: Locator, amount: number) {
    const expected = `${amount.toLocaleString('en-US')} UAH`;
    let pass = true;
    let actual = expected;
    try {
      await baseExpect(locator).toHaveText(expected);
    } catch {
      pass = false;
      actual = await locator.innerText();
    }
    return {
      pass,
      name: 'toHaveUah',
      expected,
      actual,
      message: () => `expected the price "${expected}", got "${actual}"`,
    };
  },
});

// у тесті
await expect(page.getByTestId('order-total')).toHaveUah(2749);
```

## Розбір: з чого складається матчер

| Частина | Навіщо |
|---|---|
| перший параметр (`locator`) | те, що стоїть у `expect(...)`; може бути й `page` |
| інші параметри (`amount`) | аргументи матчера |
| `baseExpect(locator).toHaveText(...)` всередині | матчер **чекає**, як вбудовані перевірки |
| `pass` | чи пройшла перевірка |
| `message` | що побачить людина у звіті — головна цінність матчера |
| `baseExpect.extend` повертає новий `expect` | саме його імпортують тести |

У справжньому фреймворку матчери живуть в окремому файлі (наприклад, `fixtures/expect.ts`), а тести імпортують `expect` звідти.

## Анотації: коли тест не має просто «пройти»

| Анотація | Що робить | Коли |
|---|---|---|
| `test.skip(умова, 'причина')` | не запускає | функції немає в цьому браузері чи середовищі |
| `test.fixme()` | не запускає, позначає «полагодити» | тест зламаний або нестабільний, є задача |
| `test.fail()` | запускає і **очікує падіння**; якщо пройшов — помилка | відомий баг продукту: дізнаєшся, коли його виправлять |
| `test.slow()` | потроює таймаут тесту | свідомо довгий сценарій |

`test.fail()` — аналог суворого `xfail`: тест не блокує прогін, але баг не зникає з поля зору.

## Типові помилки

- `expect(await page.evaluate(...)).toBe(...)` для значення, що з'являється із затримкою, — одна спроба; потрібен `expect.poll`.
- `toPass()` без `timeout` — блок виконається лише раз.
- Матчер, що всередині робить разову перевірку (`innerText()` + порівняння) — він не чекає і додає нестабільності.
- `test.step` на кожен рядок — звіт стає шумом; крок — це осмислена дія користувача.
- `test.skip()` без причини для тесту з відомим багом — баг забудуть; для цього є `test.fail()`.

## Підсумок

- `test.step` — назви кроків у звіті й трейсі; крок може повертати значення.
- `expect.poll(fn)` — для значень не з локаторів: API, `localStorage`, `evaluate`.
- `expect(async () => {...}).toPass({ timeout })` — повтор блоку дій; `timeout` обов'язково.
- `expect.extend` — власні матчери з очікуванням і зрозумілим повідомленням.
- `skip` / `fixme` / `fail` / `slow` — чесно кажуть, чому тест не «зелений як усі».
