# Функції як значення

У Python функція — такий самий об'єкт, як число чи рядок: її можна покласти в змінну, у словник, передати в іншу функцію або повернути (ти вже робив це у фабриках). На цьому побудовані `sorted(key=...)`, хелпери очікування в Playwright і повтори нестабільних кроків.

```python
def is_ok(status):
    return status == 200

check = is_ok          # без дужок — сама функція
check(200)             # True
```

## Передати функцію в функцію

Функцію, яку передають як аргумент, часто називають **callback**:

```python
def count_matching(values, condition):
    count = 0
    for v in values:
        if condition(v):
            count += 1
    return count

count_matching([200, 404, 500], is_ok)                  # 1
count_matching([200, 404, 500], lambda s: s >= 400)     # 2
```

`lambda` (з модуля Python Collections) — зручний спосіб передати коротку умову на місці.

## Перевірки в словнику

```python
EMAIL_CHECKS = {
    "not empty": lambda s: s != "",
    "has @": lambda s: "@" in s,
    "no spaces": lambda s: " " not in s,
}

for name, check in EMAIL_CHECKS.items():
    if not check("qa @example.test"):
        print(f"FAILED: {name}")       # FAILED: no spaces
```

Додати нову перевірку — додати рядок у словник, а код циклу не змінюється.

## Retry і polling

Два хелпери, які є майже в кожному фреймворку:

```python
def retry(action, attempts):
    """Викликає action, доки вона не поверне True."""
    for attempt in range(1, attempts + 1):
        if action():
            return attempt
    return None
```

**Polling** — опитувати стан, доки він не стане очікуваним: «статус замовлення став `paid`?». Playwright робить це сам (`expect(...)` повторює перевірку до таймауту), а в API-тестах такий хелпер часто пишуть вручну.

> [!QA]
> `retry` лікує симптом, а не причину. Повторювати можна **очікування** (сервер ще обробляє замовлення), але не можна «повторювати, доки тест не пройде»: так ховаються справжні баги. Кожен retry у тесті має мати пояснення, чому стан з'являється не одразу.

## map і filter

`map(функція, колекція)` застосовує функцію до кожного елемента, `filter(функція, колекція)` залишає ті, для яких функція повертає істину. Обидві повертають **ледачий** об'єкт — щоб побачити результат, загорни в `list()`:

```python
codes = ["200", "404", "500"]
list(map(int, codes))                          # [200, 404, 500]
list(filter(lambda c: c >= 400, map(int, codes)))   # [404, 500]
list(map(str.strip, [" login ", "cart "]))      # ['login', 'cart']
```

Те саме через comprehension: `[int(c) for c in codes]`. Обирай те, що читається краще: `map(str.strip, items)` — коротко, бо функція вже готова; з `lambda` comprehension зазвичай зрозуміліший.

## any і all — коротко

Ти знаєш їх з модуля Python Collections: `any(...)` — хоч один, `all(...)` — усі, і `all` на порожній колекції — `True`. З функціями-перевірками вони поєднуються природно:

```python
all(check(email) for check in EMAIL_CHECKS.values())
```

## Підсумок

- Функція — значення: її можна присвоїти, передати, повернути, покласти в словник.
- Callback — функція-аргумент; `lambda` — для коротких умов.
- Словник перевірок: додати перевірку = додати рядок.
- `retry` / `polling` — для очікування стану, а не для приховування багів.
- `map` / `filter` повертають ледачі об'єкти — `list(...)`; comprehension часто читабельніший.
