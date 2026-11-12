# Налагодження: Inspector, trace, скріншоти, відео

Тест упав. Перше питання: **хто винен** — продукт (баг), тест (помилка в тесті) чи середовище (не запущено, повільно)? Відповідь майже завжди вже є у фактах, які збирає Playwright.

## Крок 1. Прочитай повідомлення

```text
Error: expect(locator).toHaveText(expected) failed
Locator:  getByTestId('total')
Expected: "2,350 UAH"
Received: "2,600 UAH"
Timeout:  5000ms
```

| Що бачиш | Що це зазвичай означає |
|---|---|
| `strict mode violation … resolved to 2 elements` | локатор неточний: уточни (`exact`, роль, контейнер) |
| `waiting for getByRole('button', { name: 'Logout' })` до таймауту | елемента з такою назвою немає, або він не з'явився |
| `Expected … Received …` | очікування ≠ сторінка: баг продукту **або** неправильна перевірка |
| `element is not enabled` / `… intercepts pointer events` | кнопка неактивна або її щось перекриває |
| `net::ERR_CONNECTION_REFUSED` | застосунок не запущено або неправильний baseURL |
| `Target page, context or browser has been closed` | часто забутий `await` або тест закінчився раніше за дію |
| `Executable doesn't exist` | не встановлені браузери (`npx playwright install`) |

## Крок 2. Подивись, що бачив браузер

**Trace Viewer** — головний інструмент. Trace — це запис тесту: кожен крок, знімок DOM **до і після** дії, мережеві запити, консоль, джерело тесту.

```ts
// playwright.config.ts
use: { trace: 'on-first-retry' }   // або 'retain-on-failure'
```

```bash
npx playwright test --trace on      # записати trace для всіх тестів цього прогону
npx playwright show-report          # у звіті кнопка Trace у впалого тесту
npx playwright show-trace trace.zip # відкрити файл напряму
```

У trace видно, наприклад, що на момент перевірки суми ще йшов запит `/api/cart`, або що клік влучив у модальне вікно.

**Скріншоти й відео** теж налаштовуються в конфігу і прикріплюються до звіту:

```ts
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
```

## Крок 3. Пройди тест крок за кроком

```bash
npx playwright test login.spec.ts --debug   # Playwright Inspector: Step over, підсвічування локаторів
npx playwright test --ui                    # UI mode: таймлайн, знімки, watch
```

У коді можна поставити паузу: `await page.pause();` відкриє Inspector саме в цьому місці. Не забудь прибрати її перед комітом.

> [!TIP]
> У Inspector і UI mode є кнопка **Pick locator**: наведи на елемент — отримаєш рекомендований локатор. Так швидко перевіряється, чому твій локатор не знаходить елемент.

## Крок 4. Виправ причину, а не симптом

| Симптом | ❌ «Лікування» | ✅ Виправлення |
|---|---|---|
| strict mode violation | `.first()` навмання | точніший локатор |
| клік не спрацьовує | `force: true` | дочекатися стану, коли користувач може клікнути |
| перевірка «не встигає» | `waitForTimeout(3000)` | web-first перевірка або очікування події |
| текст не збігається | змінити очікування під сторінку | звірити з **вимогою**: можливо, це баг |

> [!QA]
> Не підганяй тест під поточну поведінку сторінки. Якщо тест каже `Expected "2,350 UAH", Received "2,600 UAH"`, а вимога каже 2 350, тест **правий**, і це баг-репорт. До нього додай trace і скріншот із звіту, це ідеальний доказ.

## Підсумок

- Почни з повідомлення: локатор, Expected/Received, таймаут.
- Trace Viewer показує кроки, DOM до/після, мережу й консоль. Вмикай `trace: 'on-first-retry'` або `--trace on`.
- `--debug` і `page.pause()` відкривають Inspector, `--ui` — UI mode з Pick locator.
- Скріншоти й відео (`only-on-failure` / `retain-on-failure`) прикріплюються до звіту.
- Виправляй причину. Якщо тест правий за вимогою, це баг продукту з готовими доказами.
