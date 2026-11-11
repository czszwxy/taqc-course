# CSS і XPath, ланцюжки й фільтри

Вбудованих локаторів вистачає для більшості елементів. Але на сторінках часто є **повторювані блоки**: картки товарів, рядки таблиці, задачі в списку. Треба вміти сказати «кнопка Remove **в рядку з мишкою**» чи «**перша** картка після сортування».

## CSS і XPath — запасний варіант

`page.locator()` приймає CSS або XPath (модуль 07):

```ts
page.locator('[data-testid="results"] li');      // CSS
page.locator('xpath=//li[contains(., "Phone")]');  // XPath (префікс xpath= або рядок, що починається з //)
```

> [!WARNING]
> CSS і XPath прив'язують тест до верстки. Використовуй їх, коли вбудованих локаторів справді не вистачає, і пиши короткі селектори за атрибутами (`[data-testid=…]`, `[name=email]`), а не довгі шляхи `div > div > div:nth-child(3)`.

## Ланцюжки: пошук усередині

Кожен локатор має ті самі методи `getBy…`, і вони шукають **всередині** нього:

```ts
const results = page.getByTestId('results');
const cards = results.getByRole('listitem');                 // картки лише в результатах
const row = page.getByTestId('cart-item-mouse');
await row.getByRole('button', { name: 'Remove' }).click();   // кнопка саме в цьому рядку
```

## filter(): залишити потрібні

```ts
const cards = page.getByTestId('results').getByRole('listitem');

cards.filter({ hasText: 'Phone Mini' });          // картки з цим текстом
cards.filter({ hasNotText: 'Out of stock' });     // картки БЕЗ цього тексту
cards.filter({ has: page.getByRole('button', { name: 'Add to cart' }) }); // що містять такий елемент
cards.filter({ hasText: /Laptop/ });              // регулярний вираз
```

Фільтри можна поєднувати ланцюжком: `cards.filter({ hasText: 'Laptop' }).filter({ hasNotText: 'Out of stock' })`.

## Позиція: first, last, nth

```ts
await expect(cards.first()).toContainText('Laptop Pro 15'); // перша
await expect(cards.nth(1)).toContainText('Phone Ultra');     // друга (з 0!)
await expect(cards.last()).toContainText('Phone Case S10');
```

> [!TIP]
> Позиція доречна, коли **порядок — це вимога** (сортування, «найновіше зверху»). Якщо порядок не важливий, шукай за змістом (`filter`), а не за номером.

## Скільки і які

```ts
await expect(cards).toHaveCount(14);          // web-first: чекає, поки кількість стане 14
const n = await cards.count();                // просто число зараз (без очікування)

for (const card of await cards.all()) {       // перебрати всі знайдені
  await expect(card.getByRole('button', { name: 'Add to cart' })).toBeVisible();
}
```

`toHaveCount` краще за `count()` у перевірках: він дочекається, поки список оновиться після фільтра.

## Списки, що випадають

`<select>` керується через `selectOption`:

```ts
await page.getByLabel('Category').selectOption('Laptops');                  // за value або текстом
await page.getByLabel('Sort by').selectOption({ label: 'Price: high to low' });
```

> [!QA]
> Повторювані блоки — улюблене місце багів: лічильник «N products found» не збігається з кількістю карток, сортування неправильне, кнопка в картці «Out of stock» активна. Фільтри й позиції дозволяють перевірити саме ту картку і саме те місце, про яке говорить вимога.

## Підсумок

- CSS/XPath у `page.locator()` — запасний варіант. Пиши короткі селектори за атрибутами, а не шлях у DOM.
- Ланцюжок `контейнер.getBy…()` шукає лише всередині контейнера.
- `filter({ hasText, hasNotText, has })` залишає потрібні елементи, `first()` / `last()` / `nth(i)` беруть елемент за позицією.
- `toHaveCount` перевіряє кількість з очікуванням, `all()` дає перебрати елементи.
- `selectOption` вибирає значення у `<select>`.
