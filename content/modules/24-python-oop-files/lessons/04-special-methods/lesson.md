# Спеціальні методи

Чому `len(cart)`, `a == b`, `print(order)` чи `for x in suite` працюють з одними об'єктами і падають з іншими? Python перетворює їх на виклики **спеціальних методів** (їх ще називають *dunder* — від *double underscore*): `len(x)` → `x.__len__()`, `a == b` → `a.__eq__(b)`. Dataclass генерує кілька з них сам, а для звичайних класів їх пишуть вручну.

## __repr__ і __str__

Клас для тривалості тесту в секундах:

```python
class Duration:
    def __init__(self, seconds):
        self.seconds = seconds

    def __repr__(self):                  # для розробника: як створити такий об'єкт
        return f"Duration({self.seconds})"

    def __str__(self):                   # для людей: як показати у звіті
        return f"{self.seconds // 60} min {self.seconds % 60} s"

d = Duration(135)
repr(d)     # 'Duration(135)'
str(d)      # '2 min 15 s'
print(d)    # 2 min 15 s — print використовує __str__
```

Без `__repr__` об'єкт виглядає як `<Duration object at 0x7f...>`. У f-рядку `{value!r}` вставляє `repr` значення — для рядків це текст у лапках.

> [!QA]
> Коли `assert actual == expected` падає, pytest показує `repr` обох об'єктів. З гарним `__repr__` одразу видно `Duration(135) != Duration(130)`; без нього — дві незрозумілі адреси в пам'яті.

## __eq__

За замовчуванням `==` для об'єктів порівнює **ідентичність** (той самий об'єкт), а не вміст. `Duration(135) == Duration(135)` буде `False`, поки не напишеш `__eq__`:

```python
    def __eq__(self, other):
        if not isinstance(other, Duration):
            return NotImplemented            # «не вмію порівнювати з цим типом»
        return self.seconds == other.seconds
```

`NotImplemented` (не плутати з `NotImplementedError`) каже Python: «спробуй інший спосіб». Порівняння з числом тоді просто дасть `False`, а не впаде з `AttributeError`.

> [!NOTE]
> Клас з власним `__eq__` стає **нехешованим**: його не можна покласти в `set` чи використати як ключ словника, доки не визначиш `__hash__`. Dataclass з `frozen=True` робить обидва методи сам.

## Порівняння і сортування: __lt__

```python
    def __lt__(self, other):        # self < other
        return self.seconds < other.seconds
```

Цього достатньо, щоб працювали `sorted(durations)`, `min`, `max`, а також `a > b` (Python перевертає порівняння: `b < a`).

## Оператори: __add__

```python
    def __add__(self, other):        # self + other
        return Duration(self.seconds + other.seconds)

Duration(90) + Duration(45)          # Duration(135)
```

`__add__` повертає **новий** об'єкт і не змінює ні `self`, ні `other`.

## Розбір: що викликає Python

| Ти пишеш | Python викликає |
|---|---|
| `print(d)` / `str(d)` | `d.__str__()` |
| `repr(d)`, повідомлення pytest | `d.__repr__()` |
| `a == b` | `a.__eq__(b)` |
| `a < b`, `sorted(...)` | `a.__lt__(b)` |
| `a + b` | `a.__add__(b)` |
| `len(x)` | `x.__len__()` |
| `item in x` | `x.__contains__(item)` |
| `for item in x` | `x.__iter__()` |

## Колекції: __len__, __contains__, __iter__

Скринька тестових листів (тест реєстрації перевіряє, що лист прийшов):

```python
class Inbox:
    def __init__(self):
        self._subjects = []

    def receive(self, subject):
        self._subjects.append(subject)

    def __len__(self):                    # len(inbox)
        return len(self._subjects)

    def __contains__(self, subject):      # "Welcome!" in inbox
        return subject in self._subjects

    def __iter__(self):                   # for subject in inbox
        return iter(self._subjects)
```

`__iter__` може бути й генератором (`yield` з уроку про генератори). Підкреслення в `_subjects` — домовленість: «внутрішній атрибут, ззовні не чіпати».

> [!WARNING]
> Об'єкт з `__len__` вважається **хибним**, коли довжина 0: `if inbox:` для порожньої скриньки — `False`. Іноді це саме те, що треба, а іноді — несподіванка в умовах.

## Типові помилки

- `__str__` чи `__repr__` повертає не рядок (або друкує через `print` замість `return`) — `TypeError`.
- `__eq__` без перевірки типу: порівняння з `None` чи числом падає з `AttributeError`.
- `raise NotImplementedError` замість `return NotImplemented` у `__eq__` — порівняння з іншими типами почнуть падати.
- `__add__`, що змінює `self` замість створення нового об'єкта, — несподівані зміни в «старій» змінній.

## Підсумок

- Оператори й вбудовані функції викликають dunder-методи: `==` → `__eq__`, `len()` → `__len__`.
- `__repr__` — для розробника й повідомлень pytest, `__str__` — для людей (`print`).
- `__eq__` повертає `NotImplemented` для чужих типів; з ним клас стає нехешованим.
- `__lt__` — для `<`, `sorted`, `min`, `max`; `__add__` — для `+`, повертає новий об'єкт.
- `__len__`, `__contains__`, `__iter__` роблять клас схожим на колекцію.
