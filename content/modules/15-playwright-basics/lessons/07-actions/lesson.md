# Дії: click, fill, check, select, клавіатура, файли

Дії відтворюють те, що робить користувач. Їх викликають на **локаторі**: спершу знайти, потім діяти.

## Основні дії

| Дія | Що робить | Приклад |
|---|---|---|
| `click()` | клік | `await page.getByRole('button', { name: 'Apply' }).click()` |
| `dblclick()` | подвійний клік | `await item.dblclick()` |
| `fill(text)` | очищає поле й вводить текст | `await page.getByLabel('Email').fill('demo@taskly.test')` |
| `clear()` | очищає поле | `await page.getByLabel('Search').clear()` |
| `pressSequentially(text)` | друкує по символу (для полів з автодоповненням) | `await input.pressSequentially('lap')` |
| `press(key)` | натискає клавішу | `await input.press('Enter')` |
| `check()` / `uncheck()` | ставить / знімає галочку чи radio | `await page.getByLabel('Remember me').check()` |
| `selectOption(value)` | вибір у `<select>` | `await page.getByLabel('Country').selectOption('Ukraine')` |
| `hover()` | навести мишку | `await page.getByText('Help').hover()` |
| `setInputFiles(path)` | вибрати файл для `<input type="file">` | `await page.getByLabel('Avatar').setInputFiles('tests/data/avatar.png')` |
| `page.reload()` | перезавантажити сторінку | `await page.reload()` |

## Клавіатура

```ts
await input.press('Enter');
await input.press('Escape');
await page.keyboard.press('Control+A');   // комбінація
await page.keyboard.press('Tab');         // перейти до наступного поля
```

Назви клавіш: `Enter`, `Escape`, `Tab`, `Backspace`, `ArrowDown`, `Shift`, `Control`, `Meta`. Комбінації пишуться через `+`.

> [!TIP]
> `fill` кращий за посимвольне введення майже завжди: він швидкий і надійний. `pressSequentially` потрібен, лише коли сторінка реагує на кожну клавішу (підказки пошуку, маски телефону).

## Що Playwright перевіряє перед дією

Перед `click` Playwright **сам чекає**, поки елемент:

- **прикріплений** до сторінки (attached);
- **видимий** (visible);
- **стабільний** (не анімується);
- **отримує події** (його не перекриває інший елемент, наприклад, модальне вікно);
- **активний** (enabled), а для `fill` ще й **редагований** (editable).

Якщо умови не виконуються до таймауту дії, тест падає з поясненням, **що саме** заважало («element is not enabled», «… intercepts pointer events»). Ось чому в Playwright майже ніколи не потрібні паузи.

> [!WARNING]
> `force: true` (`click({ force: true })`) вимикає ці перевірки. Користувач не може клікнути неактивну чи перекриту кнопку, а тест з `force` зможе і пропустить баг. Використовуй лише свідомо.

## Дії в контексті

Коли однакових елементів багато, спочатку знайди «рядок», потім дій усередині:

```ts
const item = page.getByTestId('todo-item').filter({ hasText: 'Buy coffee' });
await item.getByRole('checkbox').check();
await item.getByRole('button', { name: 'Edit' }).click();
```

## Перевір наслідок дії

Дія без перевірки нічого не тестує. Після кожної значущої дії перевір **результат з вимог**:

```ts
await input.press('Enter');
await expect(page.getByTestId('todo-counter')).toHaveText('3 items left');

await item.getByRole('checkbox').check();
await page.reload();
await expect(item.getByRole('checkbox')).toBeChecked(); // стан збережено?
```

> [!QA]
> `reload()` — простий, але сильний прийом. Багато багів ховаються в тому, що UI показує правильно, а **збережено** не все. Перезавантаж і перевір ще раз. Те саме з навігацією «назад».

## Підсумок

- Дії викликаються на локаторах: `click`, `dblclick`, `fill`, `clear`, `press`, `check` / `uncheck`, `selectOption`, `hover`, `setInputFiles`. Сторінку перезавантажує `page.reload()`.
- Перед дією Playwright чекає, поки елемент буде видимий, стабільний, активний і не перекритий.
- `force: true` обходить ці перевірки й може приховати баг.
- Після дії перевіряй наслідок. `reload()` допомагає перевірити, що стан збережено.
