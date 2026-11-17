# BDD і Gherkin

У вакансіях часто трапляється «досвід з BDD / Cucumber / pytest-bdd». **BDD** (Behaviour-Driven Development) — це не інструмент, а спосіб домовлятися: перш ніж писати код, аналітик, розробник і тестувальник разом формулюють **конкретні приклади** поведінки. Ці приклади записують мовою **Gherkin** — і вони стають водночас вимогами, тест-кейсами й автотестами.

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
    Given an order for 1000 UAH
    When the member pays 200 points
    Then the amount to pay is 800 UAH
    And the member has 100 points left

  Scenario: Points cannot exceed the balance
    Given an order for 1000 UAH
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

Сценарій виконується по разу для кожного рядка таблиці — це ті самі граничні значення й таблиці рішень, тільки зрозумілі бізнесу. У pytest це майже те саме, що `@pytest.mark.parametrize`.

## Як писати добрі сценарії

| Правило | Погано | Добре |
|---|---|---|
| Поведінка, а не кліки | `When I click the button with id "pay-btn"` | `When the member pays 200 points` |
| `Given` — стан, не дії в UI | `Given I open the site and log in and add an item` | `Given a signed-in member with one item in the cart` |
| `Then` — те, що видно зовні | `Then the row in table orders is updated` | `Then the order status is "Paid"` |
| Один сценарій — одна поведінка | вхід + покупка + повернення в одному | окремий сценарій на правило |
| Коротко | 15 кроків | 3–5 кроків |

Сценарій, написаний через кліки й локатори, ламається від зміни верстки і нічого не пояснює бізнесу. **Декларативний** сценарій описує, *що* відбувається; *як* — ховається в коді кроків.

## Автоматизація на Python: pytest-bdd

Кожен рядок сценарію з'єднується з функцією — **step definition**. Бібліотека **pytest-bdd** перетворює сценарії на звичайні тести pytest: працюють фікстури (зокрема `page` з pytest-playwright), маркери, звіти і `-n` з pytest-xdist.

```text
tests/
  features/loyalty.feature
  test_loyalty.py
```

```python
from playwright.sync_api import Page, expect
from pytest_bdd import given, parsers, scenarios, then, when

scenarios("features/loyalty.feature")


@given(parsers.parse("a member with {points:d} points"), target_fixture="member")
def member_with_points(points):
    return {"points": points}


@given(parsers.parse("an order for {total:d} UAH"))
def order_for(page: Page, member, total):
    page.goto(f"/checkout?demo-total={total}&demo-points={member['points']}")


@when(parsers.parse("the member pays {points:d} points"))
def pay_points(page: Page, points):
    page.get_by_label("Points to spend").fill(str(points))
    page.get_by_role("button", name="Apply points").click()


@then(parsers.parse("the amount to pay is {amount:d} UAH"))
def amount_to_pay(page: Page, amount):
    expect(page.get_by_test_id("amount-to-pay")).to_have_text(f"{amount} UAH")
```

| Елемент | Значення |
|---|---|
| `scenarios("features/loyalty.feature")` | створити тест pytest для кожного сценарію файлу (шлях — відносно файлу з тестами) |
| `parsers.parse("… {points:d} points")` | шаблон кроку; `{points:d}` — ціле число, `{name}` — рядок |
| параметри функції | спершу фікстури (`page`, `member`), далі — значення з тексту кроку за назвою |
| `target_fixture="member"` | те, що повернув крок, стає фікстурою `member` для наступних кроків |
| `pytest -m smoke` | теги Gherkin (`@smoke`) стають маркерами pytest |

Сценарій, для якого бракує step definition, падає з повідомленням, якого саме кроку немає — так зручно починати: спершу feature-файл, потім кроки один за одним. Інший відомий інструмент для Python — **behave**: він має власний раннер, як класичний Cucumber, тому не дає фікстур pytest.

## Коли BDD не окупається

BDD додає шар: текст → крок → код. Він окупається, коли сценарії справді **читають і пишуть разом** з аналітиками чи замовником. Якщо feature-файли бачить лише автоматизатор, це зайва обгортка — звичайні тести pytest з добрими назвами (і `allure.step` для звіту) простіші.

## Типові помилки

- Gherkin як «скрипт кліків» — крихко й нечитабельно.
- Кілька `When` / `Then` по черзі в одному сценарії — це кілька сценаріїв.
- `Then` перевіряє внутрішній стан (запис у базі), а не те, що бачить користувач.
- `Background` на 10 кроків — читач не пам'ятає, з чого починається сценарій.
- Число в кроці без `:d` у шаблоні: значення приходить рядком `"200"`, і порівняння з числом мовчки не збігається.
- BDD «для галочки»: сценарії пишуть після коду, і ніхто, крім QA, їх не читає.

## Підсумок

- BDD — це спільне формулювання поведінки на прикладах; Gherkin — мова для них.
- `Given` — стан, `When` — дія, `Then` — спостережуваний результат; `Scenario Outline` — таблиця даних.
- Добрий сценарій декларативний, про одну поведінку, з 3–5 кроків.
- На Python — pytest-bdd: `scenarios(...)`, `@given / @when / @then`, `parsers.parse`, `target_fixture`; кроки користуються фікстурами pytest.
- BDD корисний, коли сценарії читає бізнес; інакше вистачає звичайних тестів.
