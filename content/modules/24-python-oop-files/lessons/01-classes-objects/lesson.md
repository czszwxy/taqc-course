# Класи і об'єкти

Досі дані (словники, списки) і функції, що з ними працюють, жили окремо. **Клас** об'єднує їх: дані — в **атрибутах**, дії — в **методах**. В автотестах класи всюди: Page Object (`LoginPage` з методом `login()`), API-клієнт (`UsersApi.get_user()`), звіт прогону, модель тестових даних.

## Перший клас

Чек-лист перевірок, який можна відмічати:

```python
class Checklist:
    def __init__(self, title):
        self.title = title            # атрибути цього об'єкта
        self.items = []
        self.done = []

    def add(self, item):
        self.items.append(item)

    def check(self, item):
        if item in self.items and item not in self.done:
            self.done.append(item)

    def progress(self):
        return f"{len(self.done)}/{len(self.items)}"


login = Checklist("Login page")       # створити об'єкт (екземпляр класу)
login.add("valid password")
login.add("wrong password")
login.check("valid password")
login.progress()                      # '1/2'
```

- `class Checklist:` — оголошення класу; імена класів пишуть у `CamelCase`.
- `Checklist("Login page")` — створює **об'єкт** і автоматично викликає `__init__`.
- `__init__` — «конструктор»: тут задають початкові атрибути.
- `self` — сам об'єкт. `self.items` — атрибут **цього** чек-листа. Python передає `self` сам: пишеш `login.add("...")`, а не `login.add(login, "...")`.

## Розбір: що відбувається з об'єктом

| Рядок | `self.items` | `self.done` |
|---|---|---|
| `login = Checklist("Login page")` | `[]` | `[]` |
| `login.add("valid password")` | `['valid password']` | `[]` |
| `login.add("wrong password")` | `['valid password', 'wrong password']` | `[]` |
| `login.check("valid password")` | без змін | `['valid password']` |

Кожен метод читає і змінює **атрибути того самого об'єкта** через `self`.

## Кожен об'єкт — свій стан

```python
login = Checklist("Login page")
cart = Checklist("Cart")
login.add("valid password")
cart.progress()               # '0/0' — у чек-листа cart свої self.items
```

Клас — креслення, об'єкти — окремі «будинки» за ним.

## Атрибути з параметрами

```python
class UsersApi:
    def __init__(self, base_url, token=None):
        self.base_url = base_url
        self.token = token

    def user_url(self, user_id):
        return f"{self.base_url}/users/{user_id}"     # метод використовує атрибут

api = UsersApi("https://api.example.test")
api.user_url(42)      # 'https://api.example.test/users/42'
```

Методи можуть викликати інші методи через `self.інший_метод(...)`.

## Атрибут класу — спільний для всіх

```python
class Checklist:
    items = []        # оголошено в класі, а не в __init__

a, b = Checklist(), Checklist()
a.items.append("valid password")
b.items               # ['valid password'] — це ОДИН список на всі чек-листи!
```

> [!WARNING]
> Змінювані атрибути (`[]`, `{}`) створюй у `__init__` через `self.`. Атрибут класу — це той самий спільний стан, що й змінюваний default з модуля Functions, Modules & Errors, і так само ламає незалежність тестів.

Атрибути класу доречні для **констант**: `TIMEOUT_MS = 5000`, `PATH = "/login"`.

## isinstance і type

```python
isinstance(login, Checklist)    # True
type(login).__name__            # 'Checklist'
```

> [!QA]
> Page Object — найвідоміший приклад класу в автотестах: кожна сторінка — клас, локатори — атрибути, дії користувача — методи. Тест читається як сценарій: `login_page.login(email, password)`, а якщо зміниться верстка, правиш один клас, а не сто тестів.

## Типові помилки

- **Забутий `self` у параметрах:** `def add(item):` — при виклику `login.add("x")` буде `TypeError: takes 1 positional argument but 2 were given` (Python сам передає об'єкт першим аргументом).
- **Забутий `self.` в атрибуті:** `items = []` у `__init__` створює локальну змінну, яка зникне після виклику, — а `self.items` потім дасть `AttributeError`.
- **Клас без дужок:** `login = Checklist` — це сам клас, а не об'єкт; потрібно `Checklist("Login page")`.
- Змінюваний атрибут класу замість атрибута об'єкта — спільний стан.

## Підсумок

- Клас = атрибути (дані) + методи (дії); об'єкт — екземпляр класу.
- `__init__(self, ...)` задає початковий стан; `self` — поточний об'єкт.
- Кожен об'єкт має свої атрибути; змінювані — лише через `self.` у `__init__`.
- Атрибут класу спільний для всіх об'єктів — лише для констант.
- `isinstance(obj, Class)` — перевірка типу.
