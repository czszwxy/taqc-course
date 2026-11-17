# Типізація глибше та інструменти якості коду

У модулі «Functions, Modules & Errors» ти вже писав `def total(prices: list[int]) -> int`. У командній розробці типи — не прикраса: редактор підказує поля, перевіряльник типів знаходить помилки ще до запуску, а FastAPI й Pydantic читають анотації **під час роботи**, щоб перевіряти запити. Цей урок — про типи, які трапляються в реальному бекенд-коді, і про інструменти, що тримають код у порядку.

## Нагадування й X | None

```python
def find_user(user_id: int) -> User | None: ...

user = find_user(42)
print(user.email)    # mypy: Item "None" of "User | None" has no attribute "email"
if user is not None:
    print(user.email)    # тут mypy знає, що user — User
```

`X | None` чесно каже: «може не бути». Перевіряльник змушує обробити `None` — і так зникає цілий клас помилок `AttributeError: 'NoneType' object has no attribute ...`.

## Анотації не перевіряються під час роботи

```python
def double(value: int) -> int:
    return value * 2

double("ab")     # 'abab' — Python не заперечує
```

Анотації — підказки для людей і інструментів. Перевіряє їх **окрема програма** (`mypy`, `pyright`) до запуску. А дані ззовні (JSON запиту) під час роботи перевіряє бібліотека на кшталт Pydantic — про це в модулі FastAPI.

## Generics: одна функція для різних типів

Функція «перший елемент» працює для списку замовлень і для списку рядків, але результат має той самий тип, що й елементи. Це описують **параметром типу**. Новий синтаксис (Python 3.12+):

```python
def last[T](items: list[T]) -> T | None:
    return items[-1] if items else None


class Page[T]:
    def __init__(self, items: list[T], total: int) -> None:
        self.items = items
        self.total = total


orders_page: Page[Order] = Page(items=[...], total=120)
```

`[T]` після імені оголошує параметр типу. `last([1, 2])` для mypy — `int | None`, `last(["a"])` — `str | None`. У старішому коді те саме пишуть через `T = TypeVar("T")` — ти побачиш обидва варіанти. Параметрів може бути кілька: `def pair[K, V](...)`.

## Аліаси, Callable, Literal

```python
from collections.abc import Callable
from typing import Literal

type UserId = int                                  # аліас (Python 3.12+)
type Handler = Callable[[dict], dict]              # функція: приймає dict, повертає dict


def sort_orders(orders: list[Order], direction: Literal["asc", "desc"]) -> list[Order]: ...

sort_orders(orders, "up")   # mypy: Argument 2 has incompatible type "Literal['up']"
```

`Callable[[аргументи], результат]` описує функції-аргументи (callback, key, обробник). `Literal` обмежує значення конкретним набором.

## TypedDict — форма словника

JSON у Python — це словники. `TypedDict` описує, які ключі й типи в них очікуються:

```python
from typing import NotRequired, TypedDict


class Address(TypedDict):
    city: str
    street: str
    apartment: NotRequired[str]     # ключ може бути відсутній


Address.__required_keys__     # frozenset({'city', 'street'})
```

Під час роботи `TypedDict` — звичайний `dict`: `Address(city=1)` не впаде. Він допомагає mypy і читачеві коду, але валідацію даних з мережі треба писати (або доручити Pydantic).

## Protocol — «качина типізація» для перевіряльника

```python
from typing import Protocol


class SupportsClose(Protocol):
    def close(self) -> None: ...


def close_all(resources: list[SupportsClose]) -> None:
    for resource in resources:
        resource.close()
```

Будь-який клас з методом `close()` підходить — успадковувати `SupportsClose` не треба. Це **структурна** типізація: важлива форма, а не родовід. На відміну від ABC (попередній урок), Protocol не змушує нікого ставати нащадком. `@runtime_checkable` над протоколом дозволяє `isinstance(obj, SupportsClose)` — але перевіряється лише **наявність** методів, не їхні типи.

## Розбір: які інструменти що ловлять

```python
import os                                  # ruff: F401 `os` imported but unused

def total(prices: list[int]) -> int:
    result = 0
    for price in prices:
        result += price
    return str(result)                     # mypy: Incompatible return value type (got "str", expected "int")
```

| Інструмент | Що робить | Як запускають |
|---|---|---|
| `ruff check` | лінтер: невикористані імпорти, підозрілі конструкції, порядок імпортів | `ruff check .` (`--fix` — виправити автоматично) |
| `ruff format` | форматер: однаковий стиль без суперечок на рев'ю | `ruff format .` |
| `mypy` / `pyright` | перевірка типів | `mypy src` |
| `pytest` | перевірка поведінки | `pytest` |
| `pre-commit` | запуск усього цього перед кожним `git commit` | `pre-commit install`, далі автоматично |

Налаштування збирають у `pyproject.toml`:

```toml
[tool.ruff]
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "B"]     # pycodestyle, pyflakes, isort, bugbear

[tool.mypy]
strict = true
```

У CI запускають ті самі команди, що й локально: `ruff check .`, `ruff format --check .`, `mypy src`, `pytest`. Код, що не пройшов перевірки, не потрапляє в main.

## Типові помилки

- Думати, що анотація захищає від неправильних даних під час роботи.
- `def f(x: list = [])` — анотація не рятує від спільного змінюваного значення за замовчуванням.
- `Any` всюди «щоб mypy замовк» — перевірка типів перестає працювати.
- Ігнорувати `| None` у результаті і звертатися до атрибутів без перевірки.
- Різні налаштування форматера в команди — нескінченні зміни «лише відступів» у pull request.

## Підсумок

- `X | None` змушує обробити відсутність значення.
- Generics: `def f[T](items: list[T]) -> T`, `class Page[T]`; у старому коді — `TypeVar`.
- `type Alias = ...`, `Callable[[args], result]`, `Literal[...]`, `TypedDict`, `Protocol`.
- Анотації перевіряє mypy / pyright до запуску; дані під час роботи — валідація (Pydantic).
- `ruff check`, `ruff format`, `mypy`, `pytest`, `pre-commit`; налаштування — у `pyproject.toml`.
