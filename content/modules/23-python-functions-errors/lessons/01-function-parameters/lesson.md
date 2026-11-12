# Параметри функцій

У модулі Python Basics функції мали прості параметри. У тестовому коді функції часто мають десяток налаштувань: таймаут, кількість спроб, тестовий користувач. Python дає кілька способів зробити такі функції зручними.

## Позиційні та іменовані аргументи

```python
def login(email, password, remember=False):
    ...

login("qa@example.test", "Secret123")                       # позиційно
login(email="qa@example.test", password="Secret123")        # іменовано
login("qa@example.test", "Secret123", remember=True)        # змішано: спершу позиційні
```

Іменовані аргументи читаються краще: `remember=True` зрозуміліше, ніж просто `True`.

## Значення за замовчуванням

`remember=False` — параметр зі значенням за замовчуванням: його можна не передавати. Параметри з default ідуть **після** обов'язкових.

> [!WARNING]
> Значення за замовчуванням обчислюється **один раз** — коли Python читає `def`. Якщо це змінюваний об'єкт (`[]`, `{}`), усі виклики ділять **один і той самий** об'єкт:
>
> ```python
> def with_header(name, value, headers={}):
>     headers[name] = value
>     return headers
>
> with_header("Accept", "json")        # {'Accept': 'json'}
> with_header("X-Trace", "1")          # {'Accept': 'json', 'X-Trace': '1'} — «пам'ять» з минулого виклику!
> ```
>
> Правильно — `None` за замовчуванням і новий об'єкт усередині:
>
> ```python
> def with_header(name, value, headers=None):
>     if headers is None:
>         headers = {}
>     ...
> ```

> [!QA]
> Пастка змінюваного default — класичне джерело **нестабільних тестів**: тест проходить окремо, але падає, коли перед ним запустився інший тест, який «наповнив» спільний об'єкт. Якщо тест падає лише в повному прогоні — шукай спільний змінюваний стан.

## Keyword-only параметри

Усе після `*` у сигнатурі можна передати **тільки за ім'ям**:

```python
def wait_for(url, *, timeout=5, attempts=3):
    ...

wait_for("/api/orders", timeout=10)      # ok
wait_for("/api/orders", 10)              # TypeError — 10 що? таймаут чи спроби?
```

Так роблять у бібліотеках (і в Playwright для Python): налаштування не переплутаєш місцями.

## *args — довільна кількість позиційних

```python
def total_ms(*durations):
    return sum(durations)          # durations — кортеж

total_ms(120, 85, 340)             # 545
total_ms()                         # 0
```

## **kwargs — довільні іменовані

```python
def make_product(**overrides):
    product = {"name": "Mouse", "price": 450, "in_stock": True}
    product.update(overrides)      # overrides — словник
    return product

make_product(price=0)
# {'name': 'Mouse', 'price': 0, 'in_stock': True}
```

Це шаблон **білдера тестових даних**: розумні значення за замовчуванням, а тест перевизначає лише те, що для нього важливо. Тест «безкоштовний товар не можна купити» пише `make_product(price=0)` і не повторює всі інші поля.

## Розбір: куди потрапляє кожен аргумент

```python
def log(level, *parts, sep=" ", **extra):
    ...

log("info", "user", 42, sep=" | ", request_id="a1")
```

| Параметр | Що отримає | Чому |
|---|---|---|
| `level` | `"info"` | перший позиційний аргумент |
| `parts` | `("user", 42)` | решта позиційних — у кортеж |
| `sep` | `" \| "` | keyword-only: стоїть після `*parts` |
| `extra` | `{"request_id": "a1"}` | іменовані, для яких немає параметра, — у словник |

## Розпакування при виклику

Зірочки працюють і в інший бік — розкладають колекцію на аргументи:

```python
times = [120, 85, 340]
total_ms(*times)                   # те саме, що total_ms(120, 85, 340)

creds = {"email": "qa@example.test", "password": "Secret123"}
login(**creds)                     # login(email=..., password=...)
```

## Порядок у сигнатурі

`def f(обов'язкові, з_default, *args, keyword_only, **kwargs)` — наприклад `def log(level, *parts, sep=" ", **extra)`.

## Типові помилки

- `total_ms(times)` замість `total_ms(*times)` — у `durations` потрапить кортеж з одного **списку**, і `sum` впаде з `TypeError`.
- Позиційний аргумент після іменованого: `login(email="qa@example.test", "Secret123")` — `SyntaxError`.
- Змінюваний default (`[]`, `{}`) — спільний для всіх викликів.
- Неглибока копія: `dict(DEFAULTS)` копіює словник, але вкладений список у ньому лишається **спільним** — створюй вкладені списки заново на кожен виклик.

## Підсумок

- Іменовані аргументи роблять виклик зрозумілим; позиційні — спершу.
- Default обчислюється один раз: для списків і словників — `None` і створення всередині.
- Після `*` — тільки іменовані параметри.
- `*args` збирає позиційні в кортеж, `**kwargs` — іменовані в словник.
- `f(*list)` і `f(**dict)` розпаковують колекції в аргументи.
- Білдер тестових даних: `make_product(**overrides)` з defaults.
