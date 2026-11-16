# BDD і Gherkin

У вакансіях часто трапляється «досвід з BDD / Cucumber». **BDD** (Behaviour-Driven Development) — це не інструмент, а спосіб домовлятися: перш ніж писати код, аналітик, розробник і тестувальник разом формулюють **конкретні приклади** поведінки. Ці приклади записують мовою **Gherkin** — і вони стають водночас вимогами, тест-кейсами й автотестами.

> [!QA]
> Найцінніше в BDD — розмова. Питання тестувальника «а що, якщо бонусів більше, ніж сума замовлення?» на етапі обговорення коштує хвилину; той самий випадок, знайдений після релізу, — дні.

## Три кроки BDD

| Крок | Що відбувається | Хто |
|---|---|---|
| Discovery | обговорення правил на прикладах | аналітик, розробник, тестувальник |
| Formulation | приклади записують у Gherkin | зазвичай QA або аналітик |
| Automation | сценарії з'єднують з кодом тестів | автоматизатор, розробник |

## Мова Gherkin

```text
Feature: Loyalty points
  Members collect points and spend them on orders.

  Background:
    Given a member with 300 points

  Scenario: Points reduce the order total
    Given an order for 1,000 UAH
    When the member pays 200 points
    Then the amount to pay is 800 UAH
    And the member has 100 points left

  Scenario: Points cannot exceed the balance
    Given an order for 1,000 UAH
    When the member tries to pay 500 points
    Then the payment is rejected with "Not enough points"
    And the member still has 300 points
```

| Ключове слово | Значення |
|---|---|
| `Feature` | функція; один файл `.feature` — одна функція |
| `Scenario` (або `Example`) | один конкретний приклад поведінки |
| `Given` | початковий стан — що вже є |
| `When` | дія або подія |
| `Then` | очікуваний результат, який можна спостерігати |
| `And`, `But` | продовження попереднього кроку |
| `Background` | кроки `Given`, спільні для всіх сценаріїв файлу |
| `Scenario Outline` + `Examples` | один сценарій на кількох наборах даних |
| `@smoke` | тег для вибору сценаріїв |
| `#` | коментар |

## Scenario Outline — таблиця прикладів

```text
  Scenario Outline: Points earned for an order
    Given an order for <total> UAH
    When the order is delivered
    Then the member earns <points> points

    Examples:
      | total | points |
      | 99    | 0      |
      | 100   | 1      |
      | 1000  | 10     |
```

Сценарій виконується по разу для кожного рядка таблиці — це ті самі граничні значення й таблиці рішень, тільки зрозумілі бізнесу.

## Як писати добрі сценарії

| Правило | Погано | Добре |
|---|---|---|
| Поведінка, а не кліки | `When I click the button with id "pay-btn"` | `When the member pays 200 points` |
| `Given` — стан, не дії в UI | `Given I open the site and log in and add an item` | `Given a signed-in member with one item in the cart` |
| `Then` — те, що видно зовні | `Then the row in table orders is updated` | `Then the order status is "Paid"` |
| Один сценарій — одна поведінка | вхід + покупка + повернення в одному | окремий сценарій на правило |
| Коротко | 15 кроків | 3–5 кроків |

Сценарій, написаний через кліки й локатори, ламається від зміни верстки і нічого не пояснює бізнесу. **Декларативний** сценарій описує, *що* відбувається; *як* — ховається в коді кроків.

## Автоматизація: step definitions

Кожен рядок сценарію з'єднується з функцією. З Playwright найпростіше це робити бібліотекою **playwright-bdd**: вона генерує звичайні Playwright-тести з `.feature`-файлів.

```ts
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

Given('an order for {int} UAH', async ({ page }, total: number) => {
  await page.goto(`/checkout?demo-total=${total}`);
});

When('the member pays {int} points', async ({ page }, points: number) => {
  await page.getByLabel('Points to spend').fill(String(points));
  await page.getByRole('button', { name: 'Apply points' }).click();
});

Then('the amount to pay is {int} UAH', async ({ page }, amount: number) => {
  await expect(page.getByTestId('amount-to-pay')).toHaveText(`${amount} UAH`);
});
```

| Елемент | Значення |
|---|---|
| `'the member pays {int} points'` | шаблон кроку; `{int}`, `{string}` — параметри |
| `async ({ page }, points)` | фікстури Playwright першим аргументом, далі — параметри кроку |
| `npx bddgen && npx playwright test` | згенерувати тести з feature-файлів і запустити |

Класичний **Cucumber** працює так само, але має власний раннер; `playwright-bdd` лишає звіти, трейси й паралельність Playwright.

## Коли BDD не окупається

BDD додає шар: текст → крок → код. Він окупається, коли сценарії справді **читають і пишуть разом** з аналітиками чи замовником. Якщо feature-файли бачить лише автоматизатор, це зайва обгортка — звичайні тести з `test.step` простіші.

## Типові помилки

- Gherkin як «скрипт кліків» — крихко й нечитабельно.
- Кілька `When` / `Then` по черзі в одному сценарії — це кілька сценаріїв.
- `Then` перевіряє внутрішній стан (запис у базі), а не те, що бачить користувач.
- `Background` на 10 кроків — читач не пам'ятає, з чого починається сценарій.
- BDD «для галочки»: сценарії пишуть після коду, і ніхто, крім QA, їх не читає.

## Підсумок

- BDD — це спільне формулювання поведінки на прикладах; Gherkin — мова для них.
- `Given` — стан, `When` — дія, `Then` — спостережуваний результат; `Scenario Outline` — таблиця даних.
- Добрий сценарій декларативний, про одну поведінку, з 3–5 кроків.
- Автоматизація — step definitions (Cucumber, playwright-bdd).
- BDD корисний, коли сценарії читає бізнес; інакше вистачає звичайних тестів.
