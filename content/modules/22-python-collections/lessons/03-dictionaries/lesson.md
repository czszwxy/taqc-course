# Словники

**Словник** (`dict`) зберігає пари **ключ → значення**. Він виглядає точно як JSON-об'єкт, тому для API-тестів це головна структура даних: відповідь сервера в Python — це словник.

```python
user = {"id": 42, "email": "qa@example.test", "active": True}
user["email"]          # 'qa@example.test'
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

## Підрахунок

Один з найчастіших шаблонів — порахувати, скільки разів трапляється кожне значення. Наприклад, скільки запитів кожним HTTP-методом зробив тест:

```python
methods = ["GET", "POST", "GET"]
by_method = {}
for method in methods:
    by_method[method] = by_method.get(method, 0) + 1
```

Крок за кроком:

| Ітерація | `method` | `by_method.get(method, 0)` | `by_method` після ітерації |
|---|---|---|---|
| до циклу | — | — | `{}` |
| 1 | `"GET"` | `0` — ключа ще немає | `{'GET': 1}` |
| 2 | `"POST"` | `0` | `{'GET': 1, 'POST': 1}` |
| 3 | `"GET"` | `1` | `{'GET': 2, 'POST': 1}` |

`get(key, 0)` повертає поточне значення або 0 для нового ключа — тому новий метод не дає `KeyError`.

## Групування

Значенням словника може бути список. Наприклад, згрупувати тести за браузером:

```python
runs = [("chromium", "test_login"), ("firefox", "test_cart"), ("chromium", "test_search")]
by_browser = {}
for browser, test in runs:
    by_browser.setdefault(browser, []).append(test)
# {'chromium': ['test_login', 'test_search'], 'firefox': ['test_cart']}
```

`setdefault(key, [])` повертає наявний список або створює порожній — і відразу можна робити `append`.

## Словник як таблиця пошуку

Замість ланцюжка `if/elif` — словник:

```python
DELIVERY_FEES = {"pickup": 0, "post": 70, "courier": 150}
fee = DELIVERY_FEES.get(method)     # None для невідомого методу
```

## Типові помилки

- `counts[key] += 1` для нового ключа — `KeyError`. Використовуй `counts.get(key, 0) + 1`.
- `for x in d:` перебирає **ключі**; пари — через `d.items()`.
- `"Kyiv" in user` шукає серед **ключів**, а не значень; значення — `"Kyiv" in user.values()`.
- Додавати чи видаляти ключі під час перебору того самого словника — `RuntimeError`. Збирай зміни окремо.
- Список не може бути ключем (`TypeError: unhashable type: 'list'`); кортеж — може.

## Підсумок

- `dict` — пари ключ → значення; виглядає як JSON-об'єкт.
- `d[key]` кидає `KeyError`, `d.get(key, default)` — ні; `in` перевіряє ключі.
- `items()` для перебору пар; порядок ключів зберігається.
- Шаблони: підрахунок `get(key, 0) + 1`, групування `setdefault(key, []).append(...)`, таблиця пошуку замість `if/elif`.
