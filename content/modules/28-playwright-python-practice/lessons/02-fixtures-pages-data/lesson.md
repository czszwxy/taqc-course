# Фікстури для сторінок і даних

Page object прибрав повтори локаторів. Але кожен тест досі починається однаково: створити об'єкт, відкрити сторінку, підготувати дані. Ці рядки виносять у **фікстури** — так само, як у модулі pytest in Depth, тільки тепер вони працюють із браузером.

## Фікстура, що повертає page object

```python
import pytest
from playwright.sync_api import Page, expect

from pages.todo_page import TodoPage


@pytest.fixture
def todo(page: Page) -> TodoPage:
    todo_page = TodoPage(page)
    todo_page.goto()
    return todo_page


def test_enter_adds_a_task(todo: TodoPage):
    todo.add("Write Playwright tests")

    expect(todo.counter).to_have_text("3 items left")
```

Тест просить готову сторінку й одразу робить те, що перевіряє. `todo` залежить від `page` — фікстури pytest-playwright, тому і `todo` має scope **function**: свіжа сторінка для кожного тесту.

## Ланцюжки

```python
@pytest.fixture
def todo_with_new_task(todo: TodoPage) -> TodoPage:
    todo.add("Write Playwright tests")
    return todo
```

`todo_with_new_task` → `todo` → `page` → `context` → `browser`: pytest будує ланцюжок сам. Спільні фікстури кладуть у `tests/conftest.py`, і тести бачать їх без імпорту.

## Слухачі подій сторінки

`page.on(event, handler)` викликає функцію щоразу, коли подія стається:

| Подія | Що передається в handler | Приклад використання |
|---|---|---|
| `"console"` | `ConsoleMessage`: `.type` (`"error"`, `"warning"`, `"log"`…), `.text` | помилки в консолі браузера |
| `"pageerror"` | виняток JavaScript, який ніхто не обробив | падіння скрипта сторінки |
| `"response"` | `Response`: `.status`, `.url` | запити, що повернули 4xx / 5xx |
| `"request"` | `Request`: `.method`, `.url` | що сторінка надсилає (урок 4) |
| `"dialog"` | `Dialog` | alert / confirm / prompt (урок 5) |

Фікстура, яка збирає невдалі відповіді сервера:

```python
@pytest.fixture
def failed_responses(page: Page) -> list[str]:
    failed = []

    def remember(response):
        if response.status >= 400:
            failed.append(f"{response.status} {response.url}")

    page.on("response", remember)
    return failed


@pytest.fixture
def todo(page: Page, failed_responses) -> TodoPage:
    todo_page = TodoPage(page)
    todo_page.goto()
    return todo_page
```

Чому `todo` просить `failed_responses`, хоча сама його не використовує? Щоб слухач підключився **до** `goto()`. Інакше запити під час завантаження сторінки пройшли б повз нього.

| Порядок | Що відбувається |
|---|---|
| 1 | pytest бачить, що `todo` просить `failed_responses` |
| 2 | `failed_responses` підключає `page.on("response", ...)` і повертає порожній список |
| 3 | `todo` відкриває сторінку — слухач уже бачить усі відповіді |
| 4 | тест просить і `todo`, і `failed_responses` — це **той самий** список (фікстура одна на тест) |

## Фабрика тестових даних

```python
import uuid


@pytest.fixture
def make_user():
    def make(**overrides):
        user = {"name": "Olena Tester", "email": f"qa-{uuid.uuid4().hex[:8]}@example.com", "password": "Secret123"}
        return {**user, **overrides}

    return make


def test_short_password_is_rejected(make_user):
    user = make_user(password="Abc1")
    ...
```

Унікальний email у кожному виклику — тести не заважають один одному, навіть коли запускаються паралельно (урок 7).

## Scope і ScopeMismatch

| Що готує фікстура | Scope |
|---|---|
| page object, слухачі подій, усе, що залежить від `page` | `function` |
| дані, створені для тесту й видалені після нього (`yield`) | `function` |
| незмінні дані для всіх тестів: прочитаний JSON, токен API | `session` |

Фікстура з ширшим scope не може просити вужчу:

```text
ScopeMismatch: You tried to access the function scoped fixture page with a session scoped request object
```

Це означає: session-фікстура попросила `page`, якого на всю сесію не існує. Для «один раз на сесію» в браузері беруть `browser` і створюють власний контекст (урок 3).

> [!TIP]
> `yield` у фікстурі працює і з UI: усе, що тест створив (замовлення, користувача через API), фікстура прибирає після `yield` — навіть якщо тест упав.

## Типові помилки

- Підключати `page.on(...)` у тесті **після** `goto` — події завантаження вже пропущені.
- Фікстура `scope="session"` просить `page` → ScopeMismatch.
- Фіксований email `qa@example.com` у тестах, що створюють користувачів, — другий запуск падає з «email already taken».
- Фікстура робить і підготовку, і перевірки — тест падає ще «до початку», і незрозуміло, що він перевіряв.

## Підсумок

- Фікстура може повертати готовий page object: тест починається одразу з дії.
- Ланцюжки фікстур і `conftest.py` прибирають повтори підготовки.
- Слухачі `page.on(...)` підключають до відкриття сторінки — через залежність фікстур.
- Фабрики з унікальними даними роблять тести незалежними.
- Усе, що залежить від `page`, має scope function; session — лише для того, що не змінюється.
