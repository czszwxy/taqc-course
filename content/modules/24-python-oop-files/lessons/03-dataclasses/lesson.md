# Dataclasses

Багато класів у тестах — просто «контейнери даних»: товар, користувач, баг, замовлення. Писати для кожного `__init__` з десятком `self.x = x` нудно. Декоратор `@dataclass` робить це сам.

```python
from dataclasses import dataclass

@dataclass
class Bug:
    id: int
    title: str
    severity: int = 3          # значення за замовчуванням
```

З анотованих полів Python згенерує:

- `__init__(self, id, title, severity=3)`;
- `__repr__` — `Bug(id=7, title='Cart total wrong', severity=3)`;
- `__eq__` — два баги рівні, якщо рівні всі поля.

```python
bug = Bug(7, "Cart total wrong")
bug == Bug(id=7, title="Cart total wrong")   # True
print(bug)      # Bug(id=7, title='Cart total wrong', severity=3)
```

Анотації типів обов'язкові — саме за ними `@dataclass` знаходить поля (Python їх і тут не перевіряє). Поля зі значенням за замовчуванням ідуть після обов'язкових.

## Розбір: звичайний клас проти dataclass

Що `@dataclass` пише за тебе:

| Без `@dataclass` | З `@dataclass` |
|---|---|
| `def __init__(self, id, title, severity=3):` + три рядки `self.x = x` | генерується з полів |
| `def __repr__(self): return f"Bug(id={self.id!r}, ...)"` | генерується |
| `def __eq__(self, other): return (self.id, ...) == (other.id, ...)` | генерується |
| ~12 рядків | 4 рядки |

Менше коду — менше місць для помилки, а модель читається як опис полів.

> [!QA]
> Порівнювати моделі в тестах зручно: `assert actual == expected`. Коли тест падає, pytest показує обидва `repr` — і видно, яке саме поле відрізняється. Зі звичайними словниками таке теж працює, але dataclass ще й не дасть помилитися в назві поля.

## Методи

Dataclass — звичайний клас, методи додаються як завжди:

```python
@dataclass
class Bug:
    id: int
    title: str
    severity: int = 3

    def is_critical(self):
        return self.severity >= 4
```

## Змінювані значення: default_factory

```python
from dataclasses import dataclass, field

@dataclass
class TestRun:
    name: str
    results: list = field(default_factory=list)    # новий список для КОЖНОГО прогону
```

`results: list = []` dataclass навіть не дозволить — буде `ValueError: mutable default ... use default_factory`. Це та сама пастка спільного списку, від якої dataclass тебе захищає.

## Незмінні об'єкти: frozen

```python
from dataclasses import dataclass, replace

@dataclass(frozen=True)
class Credentials:
    email: str
    password: str

qa = Credentials("qa@example.test", "Secret123")
qa.password = "x"                          # FrozenInstanceError
rotated = replace(qa, password="NewSecret1")   # нова копія зі зміненим полем
```

Незмінні об'єкти не зміняться посеред прогону: жоден тест не підкрутить спільні дані для інших.

## Перетворення на словник

```python
from dataclasses import asdict
asdict(bug)    # {'id': 7, 'title': 'Cart total wrong', 'severity': 3}
```

Зручно, щоб надіслати модель у JSON-тілі запиту.

## З відповіді API — у модель

Функція-перетворювач бере зі словника лише потрібні поля:

```python
def bug_from_api(data):
    return Bug(id=data["id"], title=data["title"], severity=data.get("severity", 3))
```

Зайві поля відповіді (`created_at`) ігноруються, а відсутнє обов'язкове поле одразу дасть `KeyError` — тест упаде на місці, де змінився контракт.

## Типові помилки

- Поле без анотації (`severity = 3` без `: int`) — це вже **не** поле dataclass, а атрибут класу: його не буде в `__init__`.
- Поле з default перед обов'язковим — `TypeError: non-default argument follows default argument`.
- `list = []` за замовчуванням — `ValueError`: потрібен `field(default_factory=list)`.
- Забутий `@dataclass` над класом — `TypeError: Bug() takes no arguments`.

## Підсумок

- `@dataclass` + анотовані поля → `__init__`, `__repr__`, `__eq__` автоматично.
- Defaults — після обов'язкових полів; для списків і словників — `field(default_factory=list)`.
- `frozen=True` — незмінний об'єкт; `replace(obj, поле=...)` — змінена копія.
- `asdict(obj)` — словник для JSON.
- Моделі зручно порівнювати в `assert` і будувати з відповідей API.
