# Менеджери контексту: with

`with open(path) as file:` ти вже писав(ла): файл закриється сам, навіть якщо в блоці станеться помилка. Те саме потрібно скрізь у бекенді: з'єднання з базою треба повернути в пул, транзакцію — підтвердити або відкотити, блокування — зняти, тимчасовий файл — видалити. **Менеджер контексту** — об'єкт, який гарантує «підготувати → виконати блок → прибрати» за будь-якого результату.

## Що робить with

```python
with manager as value:
    body
```

| Крок | Що викликається |
|---|---|
| 1 | `value = manager.__enter__()` — підготовка; результат потрапляє в змінну після `as` |
| 2 | виконується тіло блоку |
| 3а | тіло завершилось нормально → `manager.__exit__(None, None, None)` |
| 3б | у тілі виняток → `manager.__exit__(тип, виняток, traceback)` |
| 4 | якщо `__exit__` повернув `True` — виняток «проковтнуто»; інакше він летить далі |

`__exit__` викликається **завжди** — у цьому весь сенс. Це той самий `try / finally`, лише упакований в об'єкт, який можна перевикористати.

## Клас-менеджер

```python
class PooledConnection:
    def __init__(self, pool):
        self.pool = pool
        self.conn = None

    def __enter__(self):
        self.conn = self.pool.pop()        # взяти з'єднання з пулу
        return self.conn

    def __exit__(self, exc_type, exc, tb):
        self.pool.append(self.conn)        # повернути за будь-якого результату
        return False                       # винятки не ховаємо
```

```python
pool = ["conn-1", "conn-2"]
with PooledConnection(pool) as conn:
    print(conn, pool)      # conn-2 ['conn-1']
print(pool)                # ['conn-1', 'conn-2']
```

## Розбір: виняток усередині блоку

```python
with PooledConnection(pool) as conn:
    raise TimeoutError("query took too long")
```

| Крок | Стан |
|---|---|
| `__enter__` | `conn == 'conn-2'`, `pool == ['conn-1']` |
| тіло | кидає `TimeoutError` |
| `__exit__(TimeoutError, err, tb)` | з'єднання повернулося: `pool == ['conn-1', 'conn-2']` |
| `return False` | `TimeoutError` летить далі — до коду, що викликав `with` |

Параметри `__exit__` кажуть, **чи** була помилка і **яка**: `exc_type is None` — блок завершився успішно. Повертати `True` варто лише тоді, коли менеджер свідомо обробляє помилку. Інакше баги зникають безслідно.

## contextlib.contextmanager: менеджер з генератора

Для простих випадків клас — забагато коду. Декоратор `@contextmanager` робить менеджер із генератора з **одним** `yield`:

```python
from contextlib import contextmanager


@contextmanager
def pooled_connection(pool):
    conn = pool.pop()
    try:
        yield conn            # значення для as; тут виконується тіло with
    finally:
        pool.append(conn)     # прибирання — завжди
```

| Частина генератора | Відповідає |
|---|---|
| код до `yield` | `__enter__` |
| значення в `yield` | те, що отримає `as` |
| виняток з тіла `with` | з'являється **в точці `yield`** |
| `finally` після `yield` | `__exit__` за будь-якого результату |
| `except` навколо `yield` | реакція на помилку; щоб не проковтнути — `raise` |
| `else` після `try` | лише коли блок завершився без винятку |

Без `try / finally` прибирання не виконається, якщо в блоці станеться виняток, — найчастіша помилка з `@contextmanager`.

## Готові менеджери зі стандартної бібліотеки

| Менеджер | Навіщо |
|---|---|
| `open(...)` | файл закривається |
| `contextlib.suppress(FileNotFoundError)` | свідомо ігнорувати конкретний виняток |
| `tempfile.TemporaryDirectory()` | тимчасова папка, яку потім видалять |
| `threading.Lock()` | блокування знімається |
| `unittest.mock.patch(...)` | підміна повертається назад |
| `contextlib.ExitStack()` | заздалегідь невідома кількість менеджерів |

```python
from contextlib import suppress
from pathlib import Path

with suppress(FileNotFoundError):
    Path("cache.json").unlink()     # файлу немає — і добре
```

## Кілька менеджерів

```python
with open("in.csv") as source, open("out.csv", "w") as target:
    ...
```

Входять **зліва направо**, виходять **у зворотному порядку**: спершу закривається `target`, потім `source`. Якщо `__enter__` другого менеджера впав, перший усе одно коректно завершиться.

## Де менеджери контексту у фреймворках

- SQLAlchemy: `with Session(engine) as session:` і `with session.begin():` — транзакція, що підтверджується або відкочується;
- FastAPI: залежності з `yield` — код після `yield` виконується після відповіді (закрити сесію бази);
- pytest: `with pytest.raises(...)`, фікстури з `yield`.

## Типові помилки

- `@contextmanager` без `try / finally` — після винятку прибирання не відбувається.
- `__exit__` повертає `True` «про всяк випадок» — усі помилки в блоці зникають.
- Забути `return` у `__enter__` — після `as` буде `None`.
- Два `yield` у генераторі-менеджері — `RuntimeError: generator didn't stop`.
- Користуватися ресурсом поза блоком `with` — він уже закритий.

## Підсумок

- `with` = `__enter__` → тіло → `__exit__`, і `__exit__` виконується завжди.
- `__exit__` отримує тип, виняток і traceback (або три `None`); `True` ковтає виняток — лише свідомо.
- `@contextmanager`: код до `yield` — вхід, `yield` — значення для `as`, `finally` — прибирання.
- Кілька менеджерів: вхід зліва направо, вихід справа наліво.
- Транзакції, з'єднання, блокування, тимчасові файли, підміни в тестах — усе це менеджери контексту.
