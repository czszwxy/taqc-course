# Page Object Model

Коли тестів десять, локатор `page.get_by_placeholder("What needs to be done?")` можна написати десять разів. Коли їх двісті — розробники змінюють підказку поля, і ти виправляєш двісті рядків. **Page Object Model (POM)** розв'язує це так: усе, що стосується сторінки (як знайти елементи і що з ними робити), живе в одному класі. Тести говорять мовою користувача: «додай задачу», «увійди як демо-користувач».

> [!QA]
> Page object — це карта сторінки для автотестів. Змінився інтерфейс — виправляєш карту в одному місці, а тести, що описують поведінку, лишаються без змін.

## Клас сторінки

```python
# pages/todo_page.py
from playwright.sync_api import Page


class TodoPage:
    URL = "/playground/todo"

    def __init__(self, page: Page):
        self.page = page
        self.new_task = page.get_by_placeholder("What needs to be done?")
        self.items = page.get_by_test_id("todo-item")
        self.counter = page.get_by_test_id("todo-counter")

    def goto(self):
        self.page.goto(self.URL)

    def add(self, text: str):
        self.new_task.fill(text)
        self.new_task.press("Enter")

    def item(self, text: str):
        """One task row, found by its text."""
        return self.items.filter(has_text=text)
```

```python
# tests/test_todo.py
from playwright.sync_api import Page, expect

from pages.todo_page import TodoPage


def test_enter_adds_a_task(page: Page):
    todo = TodoPage(page)
    todo.goto()

    todo.add("Write Playwright tests")

    expect(todo.item("Write Playwright tests")).to_be_visible()
    expect(todo.counter).to_have_text("3 items left")
```

## Розбір: що відбувається

| Рядок | Що робить |
|---|---|
| `todo = TodoPage(page)` | викликає `__init__`: зберігає `page` і створює **локатори** (нічого не шукає — локатор лише опис) |
| `todo.goto()` | відкриває `/playground/todo` |
| `todo.add("Write Playwright tests")` | `fill` + `press("Enter")` — два кроки під одним ім'ям з предметної області |
| `todo.item("…")` | повертає локатор рядка; перевірку робить тест |
| `expect(todo.counter).to_have_text(...)` | перевірка в тесті — тест вирішує, **що** очікувати |

## Правила доброго page object

| Правило | Чому |
|---|---|
| локатори — атрибути, створені в `__init__` | один опис елемента на весь проєкт |
| методи — дії користувача з назвами з предметної області: `add`, `sign_in`, `apply_promo` | тест читається як тест-кейс |
| метод може повертати локатор (`item(text)`) або інший page object (після переходу на нову сторінку) | тест сам вирішує, що з ним перевірити |
| `expect` — у тестах | page object не знає, який результат правильний у конкретному тесті |
| тестові дані передаються аргументами | один метод працює і з валідними, і з невалідними даними |

> [!NOTE]
> Деякі команди додають у page object методи-перевірки (`expect_counter(text)`). Це допустимо, якщо вони лише обгортають `expect` і не приховують, *що* перевіряється. Головне — page object не вирішує сам, правильна поведінка чи ні.

## Компоненти

Блоки, що повторюються на різних сторінках (шапка, рядок кошика, модальне вікно), виносять в окремі класи-компоненти, які отримують **локатор** контейнера:

```python
class TodoRow:
    def __init__(self, root):
        self.root = root
        self.checkbox = root.get_by_role("checkbox")
        self.edit_button = root.get_by_role("button", name="Edit")
```

`TodoRow(todo.item("Buy coffee")).checkbox.check()` — шукає галочку лише всередині цього рядка.

## Структура проєкту

```text
gadgetly-ui-tests/
├── pages/
│   ├── __init__.py
│   ├── todo_page.py
│   └── signup_page.py
├── tests/
│   └── test_todo.py
└── pytest.ini
```

Щоб `from pages.todo_page import TodoPage` працював з будь-якої папки, у `pytest.ini` додають корінь проєкту в шлях імпорту:

```text
[pytest]
pythonpath = .
addopts = --base-url http://localhost:5173
```

У задачах курсу клас і тести лежать в одному файлі — перевірка запускає один файл. У справжньому проєкті клас лежав би в `pages/`.

## Типові помилки

| Помилка | Що станеться |
|---|---|
| `page.goto(...)` у методі замість `self.page.goto(...)` | `NameError: name 'page' is not defined` |
| забули `self` у параметрах методу: `def goto():` | `TypeError: TodoPage.goto() takes 0 positional arguments but 1 was given` |
| `assert` / `expect` з конкретним значенням усередині `add()` | тест «на невалідні дані» впаде в page object з незрозумілою причиною |
| метод на кожен клік (`click_add_button`, `click_edit_button`…) | тест не стає читабельнішим, лише довшим |
| один метод на весь сценарій (`do_full_checkout()`) | неможливо перевірити проміжні кроки й негативні випадки |
| `time.sleep` у методах page object | усі тести стають повільними й нестабільними |

## Підсумок

- Page object = клас сторінки: локатори в `__init__`, дії — методи з назвами з предметної області.
- Тест створює page object з `page`, викликає дії і сам перевіряє результат через `expect`.
- Дані передаються аргументами; методи можуть повертати локатори й інші page objects.
- Повторювані блоки — компоненти, що отримують локатор контейнера.
- У проєкті класи лежать у `pages/`, `pythonpath = .` у `pytest.ini` робить їх імпортованими.
