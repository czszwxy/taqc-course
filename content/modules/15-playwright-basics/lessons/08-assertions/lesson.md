# Web-first і soft assertions

## Дві групи перевірок

```ts
// 1. Web-first (асинхронні): про ЕЛЕМЕНТ або СТОРІНКУ, з await, з очікуванням
await expect(page.getByTestId('total')).toHaveText('2,600 UAH');

// 2. Звичайні (синхронні): про ЗНАЧЕННЯ, без очікування — як у модулі 14
expect(2 + 2).toBe(4);
```

**Web-first** перевірка не дивиться один раз. Вона **повторює** перевірку, доки умова не виконається або не мине `expect.timeout` (5 с за замовчуванням, у лабораторії курсу 3 с). Сторінки оновлюються не миттєво: React перерахував суму, сервер відповів, анімація закінчилась. Web-first перевірка чекає рівно стільки, скільки треба.

## Найуживаніші web-first перевірки

| Перевірка | Що перевіряє |
|---|---|
| `toBeVisible()` / `toBeHidden()` | елемент видимий / прихований або відсутній |
| `toHaveText(text)` | **увесь** текст елемента (рядок, regex або масив для списку) |
| `toContainText(text)` | текст **містить** фрагмент |
| `toHaveValue(value)` | значення поля вводу |
| `toHaveCount(n)` | скільки елементів знайдено |
| `toBeChecked()` | галочка стоїть |
| `toBeEnabled()` / `toBeDisabled()` | елемент активний / неактивний |
| `toHaveAttribute(name, value)` | атрибут, наприклад `href` |
| `toHaveClass(…)` | клас (обережно: прив'язка до верстки) |
| `expect(page).toHaveURL(url)` | адреса сторінки |
| `expect(page).toHaveTitle(title)` | заголовок вкладки |

`toHaveText` для списку перевіряє всі елементи і порядок:

```ts
await expect(page.getByTestId('product-name')).toHaveText(['Wireless Mouse M2', 'Gaming Mouse X7']);
```

## Чому не читати текст вручну

```ts
// ❌ flaky: читає текст ОДИН раз, у цей момент сума ще може бути стара
const total = await page.getByTestId('total').textContent();
expect(total).toBe('2,350 UAH');

// ✅ стабільно: повторює, доки текст не стане 2,350 UAH
await expect(page.getByTestId('total')).toHaveText('2,350 UAH');
```

> [!WARNING]
> `textContent()`, `innerText()`, `isVisible()`, `count()` повертають стан **зараз** і не чекають. У перевірках використовуй web-first варіанти: `toHaveText`, `toBeVisible`, `toHaveCount`.

## Заперечення: .not

```ts
await expect(page.getByRole('alert')).not.toBeVisible();
await expect(page.getByTestId('discount')).not.toContainText('500');
```

`.not` теж чекає, поки умова стане хибною.

## Soft assertions

Звичайна перевірка зупиняє тест на першій розбіжності. **Soft** перевірка записує помилку і **продовжує** тест, а наприкінці тест буде позначений як упалий з усіма розбіжностями:

```ts
await expect.soft(page.getByTestId('subtotal')).toHaveText('3,000 UAH');
await expect.soft(page.getByTestId('shipping')).toHaveText('Free');
await expect.soft(page.getByTestId('total')).toHaveText('3,000 UAH');
```

Це зручно для групи незалежних значень (рядки підсумку, поля профілю). Ти одразу бачиш, що зламалося і Shipping, і Total, а не лише перше.

> [!TIP]
> Не роби soft-перевірки там, де подальші кроки без них не мають сенсу. Якщо не відкрилася сторінка оплати, далі тест ні на що не здатний. Тут потрібна звичайна перевірка, яка зупинить тест.

## Власне повідомлення

```ts
await expect(page.getByTestId('shipping'), 'shipping must be free from 3,000 UAH').toHaveText('Free');
```

Повідомлення з'явиться у звіті й одразу пояснить, **яка вимога** порушена.

> [!QA]
> Перевіряй **результат з вимог**, а не «щось». `toBeVisible()` для суми лише каже, що сума є. `toHaveText('2,350 UAH')` каже, що вона **правильна**. Більшість багів у кошику, промокодах і лічильниках ловить лише точна перевірка значення.

## Підсумок

- Web-first перевірки (`await expect(locator)…`) повторюються до `expect.timeout` і не залежать від швидкості сторінки.
- `toHaveText` перевіряє весь текст, `toContainText` — фрагмент. Також є `toHaveValue`, `toHaveCount`, `toBeChecked`, `toBeEnabled` / `toBeDisabled`, `toHaveURL`.
- `textContent()` + `expect(…).toBe` — ручне читання без очікування, джерело flaky-тестів.
- `.not` інвертує перевірку. `expect.soft` не зупиняє тест і збирає всі розбіжності.
- Перевіряй точне значення з вимог, а не лише наявність елемента.
