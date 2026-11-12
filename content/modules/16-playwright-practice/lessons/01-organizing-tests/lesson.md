# Організація тестів: describe, хуки, теги

Коли тестів стає 50, 200, 1000, їх треба впорядкувати: знаходити потрібний, запускати лише частину, не дублювати підготовку. Для цього в Playwright є групи, хуки і теги. Модуль 14 уже знайомив тебе з `describe` і `beforeEach` у Jest-подібних тестах. У Playwright ідея та сама.

## test.describe — групи

```ts
test.describe('Cart', () => {
  test.describe('promo codes', () => {
    test('SAVE10 gives 10% off', async ({ page }) => { /* … */ });
    test('an unknown code shows an error', async ({ page }) => { /* … */ });
  });
});
```

У звіті назва стає ланцюжком: `Cart › promo codes › SAVE10 gives 10% off`. Групуй за **функцією** або за **станом** («Paid order», «Shipped order»).

## Хуки

| Хук | Коли виконується |
|---|---|
| `test.beforeEach` | перед **кожним** тестом групи |
| `test.afterEach` | після кожного тесту (навіть якщо він упав) |
| `test.beforeAll` | один раз перед усіма тестами групи (у кожному воркері) |
| `test.afterAll` | один раз після всіх |

```ts
test.describe('Shipped order', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/playground/order');
    await page.getByRole('button', { name: 'Pay' }).click();
    await page.getByRole('button', { name: 'Ship' }).click();
  });

  test('cannot be cancelled', async ({ page }) => { /* … */ });
  test('can be delivered', async ({ page }) => { /* … */ });
});
```

**Порядок**: спершу хуки зовнішніх груп, потім внутрішніх. Для кожного тесту виходить так: `beforeEach` зовнішній → `beforeEach` внутрішній → тест → `afterEach` внутрішній → `afterEach` зовнішній.

> [!WARNING]
> `beforeAll` не має доступу до `page` (сторінка створюється для кожного тесту окремо) і виконується в **кожному воркері** окремо. Не готуй у ньому стан сторінки, від якого залежать тести: використовуй `beforeEach` або фікстури (урок 5).

## Незалежність тестів

Кожен тест має проходити **сам по собі**, у будь-якому порядку і паралельно з іншими. Тому стан готує `beforeEach` або фікстура, а не «попередній тест». Тест «Shipped order › cannot be cancelled» сам доводить замовлення до статусу Shipped.

## Теги і запуск частини набору

```ts
test('checkout works', { tag: '@smoke' }, async ({ page }) => { /* … */ });
test('all promo combinations', { tag: ['@regression', '@cart'] }, async ({ page }) => { /* … */ });
```

```bash
npx playwright test --grep @smoke            # лише smoke
npx playwright test --grep-invert @slow      # усе, крім @slow
npx playwright test --grep "@smoke|@cart"    # кілька тегів
```

> [!QA]
> Теги відображають рівні тестування з модуля 02: `@smoke` проганяють на кожен PR за 2–3 хвилини, повний `@regression` — щоночі. Так команда швидко отримує сигнал і не чекає годину на кожну зміну.

## Анотації

```ts
test.skip('feature is disabled on staging', async () => { /* … */ });
test.fixme('broken after redesign, see QA-310', async () => { /* … */ });
test.only('debug just this one', async () => { /* … */ });   // ⚠ не комітити!
test('slow report', async ({ page }) => {
  test.slow();          // утричі більший timeout для цього тесту
});
```

`test.fixme` позначає тест, який треба полагодити, і він не запускається. `test.only` запускає лише цей тест. Забутий `only` у коміті тихо вимикає весь інший набір, тому на CI вмикають `forbidOnly: true`.

## Підсумок

- `test.describe` групує тести за функцією чи станом. Назви складаються в ланцюжок у звіті.
- `beforeEach` / `afterEach` діють для кожного тесту, `beforeAll` / `afterAll` — один раз на групу у воркері. Зовнішні хуки виконуються раніше за внутрішні.
- Тести незалежні: стан готує хук або фікстура, а не попередній тест.
- Теги (`{ tag: '@smoke' }`) і `--grep` запускають частину набору.
- `skip`, `fixme`, `slow`, `only`. Тест з `only` ніколи не комітимо.
