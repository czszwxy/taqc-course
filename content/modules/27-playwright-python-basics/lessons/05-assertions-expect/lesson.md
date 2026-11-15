# Перевірки з expect

Перевірка — серце тесту: саме вона порівнює те, що бачить користувач, з вимогами. У UI-тестах сторінка змінюється не миттєво: після кліку текст оновлюється за кілька мілісекунд, а дані з сервера приходять за секунду. Тому Playwright має **web-first** перевірки: `expect(...)` не читає значення один раз, а **повторює** перевірку, доки вона не справдиться або не мине timeout.

## Перевірки локатора

| Перевірка | Що перевіряє |
|---|---|
| `to_be_visible()` / `to_be_hidden()` | елемент видно / його не видно (або немає взагалі) |
| `to_have_text("…")` | **увесь** текст елемента (пробіли по краях ігноруються) |
| `to_contain_text("…")` | текст **містить** підрядок |
| `to_have_value("…")` | значення поля вводу |
| `to_have_count(3)` | скільки елементів знайшов локатор |
| `to_be_checked()` | галочка стоїть |
| `to_be_enabled()` / `to_be_disabled()` | елемент активний / вимкнений |
| `to_have_attribute("type", "password")` | значення атрибута |
| `to_be_focused()`, `to_be_empty()`, `to_have_class(...)` | фокус, порожній елемент, CSS-клас |

Перевірки сторінки: `expect(page).to_have_url(...)`, `expect(page).to_have_title(...)`.

Заперечення — префікс `not_`: `not_to_be_visible()`, `not_to_have_text("…")`, `not_to_be_checked()`.

```python
counter = page.get_by_test_id("todo-counter")
expect(counter).to_have_text("2 items left")
expect(page.get_by_test_id("todo-item")).to_have_count(3)
expect(page.get_by_label("Remember me")).not_to_be_checked()
```

## Розбір: як працює повторення

Тест натискає Enter у полі нової задачі, лічильник має стати `3 items left`:

| Час | Що на сторінці | Що робить `expect(counter).to_have_text("3 items left")` |
|---|---|---|
| 0 мс | `2 items left` | не збіглося — чекає й пробує знову |
| ~20 мс | `3 items left` | збіглося — перевірка пройдена |
| (якби не змінилося) 5 с | `2 items left` | timeout — тест падає з `Actual value: 2 items left` |

Звичайний `assert counter.inner_text() == "3 items left"` прочитав би текст **один раз** — у момент 0 мс — і впав би, хоча через 20 мс усе було б правильно. Такий тест то проходить, то падає.

## to_have_text чи to_contain_text

```python
expect(page.get_by_test_id("result-count")).to_have_text("14 products found")   # повний збіг
expect(page.get_by_role("alert")).to_contain_text("Invalid")                     # частина
expect(page.get_by_test_id("result-count")).to_have_text(re.compile(r"\d+ products found"))  # import re
expect(page.get_by_test_id("todo-text")).to_have_text(["Write test cases for the login page", "Report the cart bug", "Buy coffee"])
```

Список у `to_have_text([...])` перевіряє тексти **всіх** знайдених елементів по порядку — зручно для сортування.

## Відсутність елемента

| Хочу перевірити | Перевірка |
|---|---|
| повідомлення зникло / не з'явилося | `expect(alert).to_be_hidden()` |
| задачу видалено зі списку | `expect(page.get_by_text("Buy coffee")).to_have_count(0)` |
| кнопка є, але неактивна | `expect(button).to_be_disabled()` |

## Повідомлення, timeout і soft assertions

```python
expect(page.get_by_test_id("result-count"), "counter after In stock only").to_have_text("2 products found")
expect(page.get_by_role("alert")).to_be_visible(timeout=10_000)   # довше, ніж за замовчуванням
```

Звичайна перевірка зупиняє тест на першій розбіжності. **Soft assertion** (`expect.soft`) записує розбіжність і йде далі; тест упаде в кінці з усіма розбіжностями одразу:

```python
expect.soft(page.get_by_test_id("result-count")).to_have_text("14 products found")
expect.soft(page.get_by_label("Search")).to_have_value("")
expect.soft(page.get_by_label("In stock only")).not_to_be_checked()
```

Soft зручні для групи незалежних значень (усі поля форми, усі суми), коли хочеш за один прогін побачити всі помилки. Для кроку, без якого далі немає сенсу, — звичайна перевірка.

## expect чи assert

| Що перевіряєш | Чим |
|---|---|
| те, що на сторінці (текст, видимість, кількість, значення поля) | `expect(...)` — чекає й повторює |
| звичайні значення Python, що вже не зміняться (статус відповіді API, обчислене число, довжина списку) | `assert` |

> [!WARNING]
> `inner_text()`, `text_content()`, `is_visible()`, `count()`, `input_value()` читають стан **один раз**. `assert page.get_by_role("alert").is_visible()` не чекає появи повідомлення — це майже завжди нестабільний тест. Пиши `expect(...).to_be_visible()`.

## Типові помилки

- `to_have_text("Invalid")` для тексту `Invalid email or password` — падає: потрібен увесь текст або `to_contain_text`.
- Перевірка відсутності через `not_to_be_visible()` одразу після дії, що *мала б* показати повідомлення: пройде і тоді, коли повідомлення з'явиться через мить. Спершу перевір результат, який має бути видно.
- `expect(page.get_by_text("Welcome back!")).to_be_visible()`, коли такий текст є у двох місцях — strict mode violation. Звузь локатор (роль heading).
- `assert expect(...)` — `expect` нічого не повертає для assert; просто виклич перевірку.

## Підсумок

- `expect` повторює перевірку до timeout — так тест не залежить від швидкості сторінки.
- `to_have_text` — увесь текст, `to_contain_text` — частина, `re.compile` — шаблон, список — кілька елементів.
- Відсутність: `to_be_hidden()` або `to_have_count(0)`; заперечення — `not_to_…`.
- `expect.soft` збирає всі розбіжності групи значень за один прогін.
- `assert` — для значень Python, `expect` — для всього, що на сторінці.
