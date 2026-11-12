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
> Значення за замовчуванням обчислюється **один раз** — коли Python читає `def`. Якщо це змінюваний об'єкт (`[]`, `{}`), усі виклики ділять **один і той самий** список:
>
> ```python
> def add_tag(tag, tags=[]):
>     tags.append(tag)
>     return tags
>
> add_tag("smoke")    # ['smoke']
> add_tag("login")    # ['smoke', 'login'] — «пам'ять» з минулого виклику!
> ```
>
> Правильно — `None` за замовчуванням і новий список усередині:
>
> ```python
> def add_tag(tag, tags=None):
>     if tags is None:
>         tags = []
>     ...
> ```

> [!QA]
> Пастка змінюваного default — класичне джерело **нестабільних тестів**: тест проходить окремо, але падає, коли перед ним запустився інший тест, який «наповнив» спільний список. Якщо тест падає лише в повному прогоні — шукай спільний змінюваний стан.

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
def make_user(**overrides):
    user = {"email": "user@example.test", "role": "customer", "active": True}
    user.update(overrides)         # overrides — словник
    return user

make_user(role="admin")
# {'email': 'user@example.test', 'role': 'admin', 'active': True}
```

Це шаблон **білдера тестових даних**: розумні значення за замовчуванням, а тест перевизначає лише те, що для нього важливо. Тест «адмін бачить панель» пише `make_user(role="admin")` і не повторює всі інші поля.

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

## Підсумок

- Іменовані аргументи роблять виклик зрозумілим; позиційні — спершу.
- Default обчислюється один раз: для списків і словників — `None` і створення всередині.
- Після `*` — тільки іменовані параметри.
- `*args` збирає позиційні в кортеж, `**kwargs` — іменовані в словник.
- `f(*list)` і `f(**dict)` розпаковують колекції в аргументи.
- Білдер тестових даних: `make_user(**overrides)` з defaults.
