# Comprehensions

У попередніх уроках ти багато разів писав один і той самий шаблон: порожній список → цикл → `append`. Він настільки частий, що в Python для нього є короткий запис — **list comprehension**.

```python
times = [120, 85, 340, 95]

slow = []
for t in times:
    if t > 100:
        slow.append(t)

slow = [t for t in times if t > 100]    # те саме одним рядком
```

Читається зліва направо: «`t` для кожного `t` у `times`, якщо `t > 100`».

## Перетворення і фільтр

Перша частина — **що** покласти в новий список, `if` наприкінці — **фільтр** (необов'язковий):

```python
names = ["Login", "Cart", "Search"]
[n.lower() for n in names]                 # ['login', 'cart', 'search']
[f"test_{n.lower()}" for n in names]       # ['test_login', 'test_cart', 'test_search']
[len(n) for n in names if n != "Cart"]     # [5, 6]
```

З розпакуванням теж працює:

```python
results = [("login", "passed"), ("cart", "failed")]
failed = [name for name, status in results if status == "failed"]   # ['cart']
```

## Dict і set comprehensions

Фігурні дужки — і отримуєш словник або множину:

```python
users = [{"id": 42, "email": "qa@gadgetly.test"}, {"id": 17, "email": "dev@gadgetly.test"}]

emails_by_id = {u["id"]: u["email"] for u in users}
# {42: 'qa@gadgetly.test', 17: 'dev@gadgetly.test'}

domains = {u["email"].split("@")[1] for u in users}
# {'gadgetly.test'}
```

Словник: `{ключ: значення for ...}`. Множина: `{значення for ...}` — дублікати зникнуть.

## any() і all()

Дві вбудовані функції для перевірок «хоч один» і «усі». Їм передають вираз у тому самому стилі, але без квадратних дужок:

```python
statuses = ["passed", "failed", "passed"]
any(s == "failed" for s in statuses)     # True — хоч один упав
all(s == "passed" for s in statuses)     # False — не всі пройшли
all(t < 500 for t in times)              # True — усі відповіді швидші за 500 мс
```

> [!WARNING]
> `all(...)` на **порожньому** списку повертає `True`. Тест `assert all(p["price"] > 0 for p in products)` пройде, навіть якщо API повернуло нуль товарів! Перевіряй окремо, що список не порожній: `assert products` або `assert len(products) > 0`.

> [!QA]
> Ця пастка — реальне джерело «зелених» тестів, які нічого не перевіряють. Коли бачиш у тесті `all(...)` або цикл з `assert` усередині, запитай себе: «а що, якщо даних нуль?».

## Коли краще звичайний цикл

Comprehension — для простих випадків: одне перетворення + один фільтр. Якщо потрібно кілька кроків, `print`, `try/except`, кілька умов `elif` — пиши звичайний цикл. Код, який легко прочитати, важливіший за код, який коротший.

```python
# важко читати — не роби так:
labels = [("slow" if t > 1000 else "ok") if t >= 0 else "invalid" for t in times]
```

## Підсумок

- `[вираз for x in колекція if умова]` — новий список; `if` — необов'язковий фільтр.
- `{k: v for ...}` — словник, `{v for ...}` — множина.
- `any(...)` — хоч один, `all(...)` — усі; `all` на порожньому — `True`, тому перевіряй, що дані є.
- Складна логіка — звичайним циклом.
