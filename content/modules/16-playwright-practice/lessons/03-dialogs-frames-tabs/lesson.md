# Діалоги, фрейми й нові вкладки

Три речі, на яких «звичайний» тест спотикається: вікна браузера (`alert`, `confirm`, `prompt`), вбудовані сторінки (`iframe`) і посилання, що відкриваються в новій вкладці. Для практики є нова сторінка Bug Playground: [My account](/playground/account).

## Діалоги

`alert`, `confirm` і `prompt` — нативні вікна браузера. Поки вікно відкрите, JavaScript сторінки стоїть. Playwright за замовчуванням **закриває** їх (`dismiss`). Щоб вирішити самому, підпишись на подію `dialog` **до** дії, яка відкриває вікно:

```ts
page.once('dialog', async (dialog) => {
  expect(dialog.type()).toBe('confirm');
  expect(dialog.message()).toBe('Delete your account? This cannot be undone.');
  await dialog.dismiss();      // Cancel
});
await page.getByRole('button', { name: 'Delete account' }).click();
```

| Метод | Що робить |
|---|---|
| `dialog.accept()` | OK |
| `dialog.accept('Nova')` | OK з текстом у `prompt` |
| `dialog.dismiss()` | Cancel / закрити |
| `dialog.type()` | `alert`, `confirm`, `prompt` або `beforeunload` |
| `dialog.message()` | текст вікна |

`page.once` спрацює один раз, `page.on` — для всіх діалогів (зручно, коли вікна йдуть одне за одним: prompt, потім alert).

> [!WARNING]
> Обробник **має** закрити діалог (`accept` або `dismiss`), інакше сторінка зависне, і тест упаде за таймаутом.

> [!QA]
> Діалоги — класичне місце багів: Cancel, який усе одно видаляє; prompt, що приймає порожнє значення; текст підтвердження, що не каже, **що** буде видалено. Перевіряй обидві гілки: OK і Cancel.

## Фрейми (iframe)

`iframe` — окрема сторінка всередині сторінки: віджет чату, платіжна форма, карта. Звичайні локатори в нього **не заходять**:

```ts
const chat = page.frameLocator('iframe[title="Help chat"]');
await chat.getByLabel('Your question').fill('Where is my order?');
await chat.getByRole('button', { name: 'Send' }).click();
await expect(chat.getByRole('status')).toHaveText("Thanks! We'll reply within 24 hours.");
```

Новіший запис робить те саме: `page.getByTitle('Help chat').contentFrame()`. Далі всередині фрейму працюють ті самі `getByRole`, `getByLabel`, перевірки й автоочікування.

## Нові вкладки (popup)

Посилання з `target="_blank"` відкриває нову вкладку. Очікування **починаємо до кліку**, бо інакше подію можна пропустити:

```ts
const popupPromise = page.waitForEvent('popup');
await page.getByRole('link', { name: 'Terms of Service' }).click();
const terms = await popupPromise;

await expect(terms.getByRole('heading', { name: 'Gadgetly Terms of Service' })).toBeVisible();
await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible(); // стара вкладка жива
```

Альтернатива — подія контексту: `context.waitForEvent('page')`. Усі вкладки контексту: `context.pages()`. Закрити вкладку: `await terms.close()`.

> [!TIP]
> Патерн «спершу Promise, потім дія, потім await» стосується всіх подій: `waitForEvent('popup')`, `waitForEvent('download')`, `waitForRequest`, `waitForResponse`. Якщо почати чекати після кліку, подія може вже статися.

## Підсумок

- Діалоги закриваються автоматично. Щоб керувати ними, використовуй `page.on/once('dialog')` до дії, потім `accept()`, `accept(text)` або `dismiss()`.
- Перевіряй тип і текст діалогу, а також обидві гілки: OK і Cancel.
- Iframe: `page.frameLocator(selector)` або `locator.contentFrame()`, далі звичайні локатори.
- Нова вкладка: `const p = page.waitForEvent('popup')` → клік → `await p`. Чекати починаємо до кліку.
