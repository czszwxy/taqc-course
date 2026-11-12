# Вкладені дані (JSON-подібні структури)

Реальна відповідь API рідко буває плоскою. Зазвичай це словник, у якому лежать списки словників, а в них — ще словники:

```python
order = {
    "id": 1002,
    "status": "paid",
    "customer": {"id": 42, "email": "qa@example.test", "address": {"city": "Kyiv"}},
    "items": [
        {"product_id": 1, "title": "Mouse", "price": 450, "qty": 2},
        {"product_id": 3, "title": "Cable", "price": 150, "qty": 1},
    ],
}
```

Нового синтаксису тут немає — лише ключі й індекси, з'єднані в ланцюжок.

## Доступ ланцюжком

```python
order["customer"]["email"]               # 'qa@example.test'
order["customer"]["address"]["city"]     # 'Kyiv'
order["items"][0]["title"]               # 'Mouse'
len(order["items"])                      # 2
order["items"][-1]["price"]              # 150
```

Читай зліва направо: «у замовленні → покупець → адреса → місто».

## Розбір крок за кроком

Що повертає кожна ланка виразу `order["items"][1]["title"]`:

| Вираз | Значення | Тип |
|---|---|---|
| `order` | увесь словник замовлення | `dict` |
| `order["items"]` | список з двох позицій | `list` |
| `order["items"][1]` | `{"product_id": 3, "title": "Cable", ...}` | `dict` |
| `order["items"][1]["title"]` | `'Cable'` | `str` |

Правило просте: у **словника** беремо значення за **ключем** (`["items"]`), у **списку** — за **індексом** (`[1]`). Якщо заплутався — надрукуй проміжний крок: `print(type(order["items"]))`.

## Цикли по вкладених списках

```python
titles = [item["title"] for item in order["items"]]    # ['Mouse', 'Cable']

expensive = []
for item in order["items"]:
    if item["price"] > 300:
        expensive.append(item["title"])
# ['Mouse']
```

## Коли чогось немає

Два різні падіння:

```python
order["coupon"]                  # KeyError: 'coupon' — ключа немає
user = {"address": None}
user["address"]["city"]          # TypeError: 'NoneType' object is not subscriptable
```

Друге означає: на якомусь рівні замість словника прийшов `None`. Безпечне читання по рівнях:

```python
address = user.get("address") or {}
city = address.get("city")       # None, але без падіння
```

`x or {}` дає порожній словник, якщо `x` — `None` (або ключа не було). Коротший ланцюжок `user.get("address", {}).get("city")` захищає лише від **відсутнього** ключа: якщо там явно `None`, він впаде з `AttributeError: 'NoneType' object has no attribute 'get'`.

> [!QA]
> У тесті безпечне читання — не завжди добре. Якщо поле **обов'язкове** за контрактом, нехай тест впаде з `KeyError` (або перевір `assert "email" in user`): «тихий» `None` сховає баг API. `get()` — для полів, які справді можуть бути відсутні.

## Модуль json

API присилає JSON як **текст**. Модуль `json` зі стандартної бібліотеки перетворює текст у Python-об'єкти і назад:

```python
import json

text = '{"id": 42, "active": true, "phone": null, "tags": ["qa"]}'
user = json.loads(text)          # str → dict
user["active"]                   # True
json.dumps(user)                 # dict → str
json.dumps({"city": "Київ"}, ensure_ascii=False, indent=2)   # кирилиця без \u-кодів, з відступами
```

| JSON | Python |
|---|---|
| object `{}` | `dict` |
| array `[]` | `list` |
| string | `str` |
| number | `int` / `float` |
| `true` / `false` | `True` / `False` |
| `null` | `None` |

> [!WARNING]
> Ключі JSON-об'єкта — **завжди рядки**. Після `json.loads('{"1": "a"}')` ключ буде `"1"`, а не `1`: `data[1]` дасть `KeyError`.

## Типові помилки

- `order["items"]["title"]` — `TypeError: list indices must be integers or slices, not str`: між `items` і `title` бракує індексу позиції.
- `order["items"][2]` у списку з двох позицій — `IndexError`.
- `json.loads` приймає **рядок**; якщо в тебе вже словник, перетворювати не треба.
- Змінюючи вкладений словник, отриманий з іншої змінної, ти змінюєш **те саме** джерело — для незалежної копії потрібна глибока копія (`copy.deepcopy`).

## Підсумок

- Вкладені дані — ланцюжок ключів та індексів: `order["items"][0]["price"]`; у словника — ключ, у списку — індекс.
- `KeyError` — немає ключа; `TypeError: 'NoneType'...` — на якомусь рівні `None`.
- Безпечно: `(d.get("key") or {}).get(...)`; але обов'язкові поля в тестах перевіряй явно.
- `json.loads` — текст → Python, `json.dumps` — Python → текст (`ensure_ascii=False`, `indent`).
- `null` → `None`, `true` → `True`; ключі JSON — завжди рядки.
