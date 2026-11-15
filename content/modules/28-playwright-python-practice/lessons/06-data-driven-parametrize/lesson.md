# Data-driven тести з parametrize

Таблиці граничних значень і класів еквівалентності з модуля про тест-дизайн чудово лягають в автотести: кроки однакові, змінюються лише дані й очікуваний результат. Замість десяти майже однакових функцій — одна функція і таблиця даних. Це і є **data-driven testing**.

## parametrize разом із page

```python
import pytest
from playwright.sync_api import Page, expect


@pytest.mark.parametrize(
    ("query", "expected_count"),
    [("mouse", 2), ("laptop", 3), ("earbuds", 1)],
)
def test_search_finds_products(page: Page, query, expected_count):
    page.goto("/playground/search")

    page.get_by_label("Search").fill(query)

    expect(page.get_by_test_id("results").get_by_role("listitem")).to_have_count(expected_count)
```

pytest створює **три окремі тести**: `test_search_finds_products[mouse-2]`, `[laptop-3]`, `[earbuds-1]`. Кожен отримує свою фікстуру `page` — новий контекст. Упав один — два інші все одно виконаються, і звіт одразу покаже, на яких даних проблема.

## Читабельні ids

```python
@pytest.mark.parametrize(
    ("query", "expected_count"),
    [("MOUSE", 2), ("  mouse  ", 2)],
    ids=["upper-case", "spaces-around"],
)
```

`ids` можна задати і функцією: `ids=lambda value: f"age-{value}"`. У звіті `test_age_accepted[age-18]` читається краще, ніж `test_age_accepted[18]`, а `[case3]` — не читається взагалі.

## pytest.param: власний id і марки

```python
@pytest.mark.parametrize(
    "query",
    [
        pytest.param("mouse", id="lower-case"),
        pytest.param("MOUSE", id="upper-case"),
        pytest.param("mоuse", id="cyrillic-o", marks=pytest.mark.xfail(reason="QA-31: homoglyphs are not normalized", strict=True)),
    ],
)
```

Окремий випадок можна позначити як відомий баг (`xfail` з номером задачі) — інші випадки лишаються звичайними тестами.

## Дані з файлу

Коли таблиця велика або її веде аналітик, дані виносять у файл поруч із тестами:

```python
import json
from pathlib import Path

SEARCH_CASES = json.loads(Path(__file__).with_name("search_cases.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("case", SEARCH_CASES, ids=lambda case: case["query"])
def test_search_from_file(page: Page, case):
    page.goto("/playground/search")
    page.get_by_label("Search").fill(case["query"])
    expect(page.get_by_test_id("results").get_by_role("listitem")).to_have_count(case["expected_count"])
```

Файл читається один раз, під час збирання тестів.

## Валідні й невалідні — окремо

Спокуса — один параметризований тест з `if`:

```python
# погано: дві різні перевірки в одному тесті
if accepted:
    expect(welcome).to_be_visible()
else:
    expect(error).to_have_text(message)
```

Краще дві функції: `test_valid_age_is_accepted` (список валідних значень) і `test_invalid_age_is_rejected` (пари «значення, повідомлення»). Кожен тест має одну перевірку поведінки, а назва в звіті одразу каже, яка група впала.

| Таблиця з тест-дизайну | Тест |
|---|---|
| межі класу «приймається»: 18, 65 | `test_valid_age_is_accepted[18]`, `[65]` |
| межі класу «відхиляється»: 17, 66 | `test_invalid_age_is_rejected[17]`, `[66]` |
| інший клас помилки: `abc` | `test_invalid_age_is_rejected[abc]` з іншим повідомленням |

## Скільки — це забагато

Два декоратори `parametrize` на одному тесті перемножуються: 5 значень × 4 значення = 20 тестів у браузері, кожен по 1–2 секунди. Параметризуй те, що справді є різними класами еквівалентності, а не «про всяк випадок».

## Типові помилки

- `if` / `else` у тілі параметризованого тесту замість двох тестів.
- Ids на кшталт `[case0]`, `[case1]` — у звіті незрозуміло, що впало.
- 50 значень одного класу еквівалентності: повільно і нічого нового не перевіряє.
- Спільний змінюваний словник даних, який тест модифікує, — наступний випадок отримує зіпсовані дані.

## Підсумок

- `parametrize` + `page` = окремий тест у новому контексті для кожного рядка даних.
- `ids` (список чи функція) і `pytest.param(id=...)` роблять звіт читабельним; `marks=` позначає відомі баги.
- Великі таблиці — у JSON-файл поруч із тестами.
- Валідні й невалідні значення — окремими тестами, без `if` у тесті.
- Кожен рядок — це секунди в браузері: параметризуй класи, а не все підряд.
