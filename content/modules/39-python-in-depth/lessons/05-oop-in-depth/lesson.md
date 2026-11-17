# ООП глибше: property, classmethod, Enum, ABC

Класи з модуля «OOP, Files & Project Setup» вміють зберігати дані й мати методи. У бекенд-коді до них додають ще кілька інструментів: атрибути, що перевіряють значення, «другі конструктори» для даних з API, перелічення замість рядків-статусів і базові класи, які зобов'язують нащадків реалізувати потрібні методи. Моделі Django, SQLAlchemy і Pydantic побудовані саме на цьому.

## @property — атрибут, за яким стоїть метод

```python
class Product:
    def __init__(self, name, price):
        self.name = name
        self.price = price               # іде через setter нижче

    @property
    def price(self):
        return self._price

    @price.setter
    def price(self, value):
        if value < 0:
            raise ValueError("price must not be negative")
        self._price = value

    @property
    def price_with_vat(self):            # обчислюваний, лише для читання
        return round(self._price * 1.2)
```

## Розбір: що відбувається при зверненні

| Код | Що насправді викликається |
|---|---|
| `product.price` | метод-getter `price(self)` → повертає `self._price` |
| `product.price = 100` | метод-setter → перевірка → `self._price = 100` |
| `product.price = -5` | setter кидає `ValueError`, значення не змінюється |
| `product.price_with_vat` | getter рахує значення щоразу заново |
| `product.price_with_vat = 1` | `AttributeError`: у property немає setter |

Справжнє значення лежить в атрибуті з підкресленням (`_price`) — це домовленість «внутрішнє, не чіпай ззовні». Якщо в setter написати `self.price = value` замість `self._price`, setter викличе сам себе — `RecursionError`. Перевага property: зовнішній код пише звичайне `product.price`, а перевірку можна додати пізніше, нічого не змінюючи у викликах.

## @classmethod — альтернативний конструктор

```python
class Money:
    def __init__(self, amount, currency):
        self.amount = amount
        self.currency = currency

    @classmethod
    def from_string(cls, text):          # "12.50 UAH"
        amount, currency = text.split()
        return cls(float(amount), currency)


Money.from_string("12.50 UAH").currency     # 'UAH'
```

`cls` — це клас, через який метод викликали. Якщо `class Price(Money)` викличе `Price.from_string(...)`, `cls` буде `Price`, і повернеться об'єкт `Price`. Тому всередині пишуть `cls(...)`, а не `Money(...)`. Типові імена: `from_dict`, `from_row`, `from_env`.

## @staticmethod — функція всередині класу

```python
class Money:
    @staticmethod
    def is_valid_currency(code):
        return len(code) == 3 and code.isupper()
```

Не отримує ні `self`, ні `cls`. Часто звичайна функція в модулі — простіше; staticmethod доречний, коли функція логічно належить класу.

## Enum — перелічення замість «магічних рядків»

```python
from enum import Enum, IntEnum, StrEnum, auto


class Role(StrEnum):
    CUSTOMER = "customer"
    MANAGER = "manager"
    ADMIN = "admin"


Role("admin")             # <Role.ADMIN: 'admin'> — з рядка з API
Role.ADMIN.value          # 'admin'
Role.ADMIN == "admin"     # True — StrEnum і є рядком
[role.value for role in Role]   # ['customer', 'manager', 'admin']
Role("root")              # ValueError: 'root' is not a valid Role
```

| Вид | Значення | Порівняння з «сирим» значенням |
|---|---|---|
| `Enum` | будь-які, часто `auto()` | `Color.RED == 1` → `False` |
| `StrEnum` (3.11+) | рядки | `Role.ADMIN == "admin"` → `True`; зручно для JSON і баз |
| `IntEnum` | цілі числа | `Priority.HIGH == 3` → `True`; можна сортувати |

Перелічення ловить друкарські помилки (`Role.ADMNI` — `AttributeError` одразу, а рядок `"admni"` тихо пройде) і показує в одному місці всі допустимі значення.

## ABC — базовий клас, що вимагає реалізації

```python
from abc import ABC, abstractmethod


class Storage(ABC):
    @abstractmethod
    def save(self, key, data): ...

    @abstractmethod
    def load(self, key): ...

    def copy(self, source, target):      # звичайний метод, спільний для всіх
        self.save(target, self.load(source))


class MemoryStorage(Storage):
    def __init__(self):
        self.items = {}

    def save(self, key, data):
        self.items[key] = data

    def load(self, key):
        return self.items[key]
```

| Код | Результат |
|---|---|
| `Storage()` | `TypeError: Can't instantiate abstract class Storage…` |
| нащадок без `load` | `TypeError` при створенні об'єкта — помилка видна одразу, а не в продакшні |
| `MemoryStorage().copy("a", "b")` | спільний метод працює з будь-якою реалізацією |

Метод `copy` — **шаблонний метод**: загальний алгоритм у базовому класі, кроки — в нащадках. Так влаштовані сховища файлів (локально / S3), платіжні шлюзи, відправники повідомлень. У тестах підставляють фейкову реалізацію того самого інтерфейсу.

## Типові помилки

- `self.price = value` усередині setter `price` — нескінченна рекурсія.
- `return Money(...)` у classmethod — нащадки отримують об'єкт базового класу.
- Статуси рядками по всьому коду (`"payed"`, `"Paid"`, `"paid "`) замість одного Enum.
- `Enum` (не `StrEnum`) порівнюють з рядком — завжди `False`.
- Абстрактний метод без `@abstractmethod` — клас без реалізації створюється, а помилка вилазить пізніше.

## Підсумок

- `@property` — getter, setter з перевіркою, обчислювані атрибути; значення зберігається в `_name`.
- `@classmethod` — альтернативні конструктори; всередині `cls(...)`.
- `@staticmethod` — функція в просторі імен класу, без `self` і `cls`.
- `Enum` / `StrEnum` / `IntEnum` — фіксований набір значень; `Role("admin")` перетворює значення з API.
- `ABC` + `@abstractmethod` — контракт для нащадків; базовий клас не створюється.
