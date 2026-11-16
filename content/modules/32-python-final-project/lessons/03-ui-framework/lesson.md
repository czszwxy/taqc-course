# UI-фреймворк на pytest і Playwright

Етапи 3–5 будують фреймворк для Returns & refunds крок за кроком. Кожен етап — це Playwright-задача на Python, яку перевіряють на **прихованих регресіях**: твої тести мають бути зеленими на правильній сторінці й червоними на кожній версії з одним дефектом. Так перевіряють справжній фреймворк — чи ловить він те, заради чого написаний.

## Page object для багатокрокової форми

Сторінка повернення — це кілька кроків: знайти замовлення → вибрати товари → причина, стан, спосіб → коментар → запит. Page object відображає ці кроки **діями користувача**:

| Метод | Що робить |
|---|---|
| `open()` | відкриває `/playground/returns` |
| `find_order(number, email)` | заповнює пошук і чекає на картку замовлення |
| `item(name)` | чекбокс товару: `get_by_role("checkbox", name=f"Return {name}")` |
| `increase(name)` | кнопка «+» для товару |
| `set_condition("Opened")` | радіокнопка стану |
| `return_number()` | номер з підтвердження без `#` |

Перевірки (`expect(...)`) — у тестах. Page object повертає локатори (`self.refund`, `item(...)`), а тест вирішує, що з ними має бути.

## Пастки локаторів на цій сторінці

| Локатор | Проблема | Рішення |
|---|---|---|
| `get_by_label("Opened")` | збігається і з «**Un**opened» — strict mode violation | `get_by_label("Opened", exact=True)` |
| `get_by_label("Email")` | збігається і з «Email used for the order» | `exact=True` |
| `get_by_text("2,909 UAH")` | текст може бути і в підсумку, і в підтвердженні | `get_by_test_id("summary-refund")` |
| `get_by_role("button", name="Return")` | частково збігається з «Request return», «Return another item» | точна назва або `exact=True` |

## Фікстури

```python
@pytest.fixture
def returns_page(page: Page) -> ReturnsPage:
    return ReturnsPage(page).open()


@pytest.fixture
def created_returns(base_url):
    """Return numbers created through the page; cancelled through the API after the test."""
    created = []
    yield created
    for number, email in created:
        requests.delete(f"{base_url}/api/returns/{number}", params={"email": email}, timeout=TIMEOUT)
```

`returns_page` прибирає повтор `ReturnsPage(page).open()` з кожного тесту. `created_returns` — прибирання: тест, що створив повернення через UI, додає `(номер, email)` у список, а після тесту (навіть упалого) фікстура скасовує їх через API.

## Тестові дані

```python
@dataclass(frozen=True)
class Customer:
    order: int
    email: str


ANNA = Customer(5001, "anna.koval@example.test")
MAX = Customer(5002, "max.bondar@example.test")
```

Дані в одному місці: замовлення змінилося — правиш одну константу. `frozen=True` — тест не може випадково змінити спільні дані.

## Параметризація меж

Межі вікна — класична таблиця даних:

```python
@pytest.mark.parametrize(
    "order, email, item, reason, refund",
    [
        (5002, MAX.email, "Mechanical Keyboard K8", "changed-mind", "2,109 UAH"),
        ...
    ],
    ids=["day-14-changed-mind", ...],
)
def test_return_is_allowed_inside_the_window(returns_page, order, email, item, reason, refund):
    ...
```

`ids` роблять звіт читабельним: `test_return_is_allowed_inside_the_window[day-14-changed-mind]` одразу каже, яка межа впала.

## Структура репозиторію фінального проєкту

```text
returns-tests/
├── pages/returns_page.py      ← ReturnsPage
├── api/returns_api.py         ← клієнт returns API (урок 4)
├── models/returns.py          ← pydantic-моделі (урок 4)
├── data/customers.py          ← Customer, ANNA, MAX…
├── tests/ui/test_returns_ui.py
├── tests/api/test_refunds.py
├── conftest.py                ← returns_page, created_returns, api
└── pyproject.toml / requirements.txt / README.md
```

У задачах лабораторії все це — **в одному файлі** (так влаштована перевірка), але шари ті самі: клас сторінки, фікстури, дані, тести.

## Підсумок

- Page object = дії користувача; перевірки — у тестах.
- `exact=True` для «Opened» / «Unopened» і «Email»; суми — через `data-testid`.
- Фікстури: сторінка і прибирання створених повернень через API.
- Дані — frozen dataclass в одному місці; межі — параметризовані з `ids`.
- Шари фреймворку однакові і в одному файлі, і в репозиторії.
