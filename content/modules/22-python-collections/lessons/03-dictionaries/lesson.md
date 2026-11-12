# Словники

**Словник** (`dict`) зберігає пари **ключ → значення**. Він виглядає точно як JSON-об'єкт, тому для API-тестів це головна структура даних: відповідь сервера в Python — це словник.

```python
user = {"id": 42, "email": "qa@gadgetly.test", "active": True}
user["email"]          # 'qa@gadgetly.test'
```

Ключі — зазвичай рядки (або числа), унікальні. Значення — будь-які, навіть інші словники і списки.

## Читати безпечно: get()

```python
user["phone"]                  # KeyError: 'phone'
user.get("phone")              # None
user.get("phone", "unknown")   # 'unknown'
"phone" in user                # False — in перевіряє КЛЮЧІ
```

> [!QA]
> `KeyError` в автотесті часто означає не баг тесту, а **зміну контракту API**: поле перейменували або прибрали. Перевіряй обов'язкові поля явно (`"email" in response`), щоб тест падав з зрозумілим повідомленням.

## Змінювати

```python
user["name"] = "Olena"         # додати або замінити
user.update({"active": False, "city": "Kyiv"})
del user["city"]               # видалити (KeyError, якщо немає)
removed = user.pop("name", None)   # видалити й повернути, без помилки
```

## Перебір

```python
for key in user:                       # ключі
    print(key)
for key, value in user.items():        # пари
    print(f"{key} = {value}")
list(user.keys()), list(user.values())
```

Словник зберігає **порядок додавання** ключів.

## Підрахунок і групування

Підрахунок — один з найчастіших шаблонів:

```python
counts = {}
for status in ["passed", "failed", "passed"]:
    counts[status] = counts.get(status, 0) + 1
# {'passed': 2, 'failed': 1}
```

Групування — значення словника є списком:

```python
groups = {}
for name, status in [("login", "passed"), ("cart", "failed"), ("search", "passed")]:
    groups.setdefault(status, []).append(name)
# {'passed': ['login', 'search'], 'failed': ['cart']}
```

`setdefault(key, [])` повертає наявний список або створює порожній — і відразу можна робити `append`.

## Словник як таблиця пошуку

Замість ланцюжка `if/elif` — словник:

```python
DELIVERY_FEES = {"pickup": 0, "post": 70, "courier": 150}
fee = DELIVERY_FEES.get(method)     # None для невідомого методу
```

## Підсумок

- `dict` — пари ключ → значення; виглядає як JSON-об'єкт.
- `d[key]` кидає `KeyError`, `d.get(key, default)` — ні; `in` перевіряє ключі.
- `items()` для перебору пар; порядок ключів зберігається.
- Шаблони: підрахунок `get(key, 0) + 1`, групування `setdefault(key, []).append(...)`, таблиця пошуку замість `if/elif`.
