# Кортежі і розпакування

**Кортеж** (`tuple`) — впорядкована **незмінна** колекція. Його зручно використовувати як невеликий запис з кількох полів: назва тесту, статус, тривалість.

```python
result = ("test_login", "passed", 1.25)
point = (10, 20)
single = ("only",)      # кортеж з одного елемента — з комою!
```

Індекси й зрізи — як у списків, але змінити кортеж не можна: `result[1] = "failed"` → `TypeError`.

## Розпакування

Значення кортежу можна одразу розкласти по змінних:

```python
name, status, duration = result
print(name)        # test_login
```

Кількість змінних має збігатися з кількістю елементів, інакше `ValueError: too many values to unpack` (або `not enough values`).

Розпаковувати можна будь-яку послідовність, наприклад результат `split`:

```python
method, path = "GET /api/orders".split()
# method = 'GET', path = '/api/orders'
```

Зірочка збирає «решту»:

```python
first, *rest = ["smoke", "login", "cart"]
# first = 'smoke', rest = ['login', 'cart']
```

Обмін значеннями без тимчасової змінної: `a, b = b, a`.

## Розпакування в циклі

Список кортежів — типова форма даних «таблиця». Розпаковуй прямо в `for`:

```python
results = [("test_login", "passed", 1.25), ("test_cart", "failed", 3.4)]
for name, status, duration in results:
    print(f"{name}: {status} in {duration}s")
```

## enumerate і zip

Обидві функції дають **кортежі**:

```python
for i, name in enumerate(["login", "cart"], start=1):
    print(i, name)          # 1 login / 2 cart

names = ["login", "cart"]
statuses = ["passed", "failed"]
for name, status in zip(names, statuses):
    print(name, status)     # login passed / cart failed
```

`zip` іде паралельно кількома списками і **зупиняється на найкоротшому**.

## Розбір крок за кроком

Нумерований звіт з пар `(name, status)`:

```python
pairs = [("login", "passed"), ("cart", "failed")]
for number, (name, status) in enumerate(pairs, start=1):
    print(f"{number}. {name} — {status}")
```

| Ітерація | Що дає `enumerate` | `number` | `name` | `status` |
|---|---|---|---|---|
| 1 | `(1, ("login", "passed"))` | `1` | `"login"` | `"passed"` |
| 2 | `(2, ("cart", "failed"))` | `2` | `"cart"` | `"failed"` |

`enumerate` загортає кожен елемент у пару «номер + елемент», а дужки `(name, status)` розпаковують вкладений кортеж.

> [!QA]
> `zip` ідеальний для порівняння «очікуване vs фактичне» рядок за рядком: колонка з вимог і колонка з UI. Але пам'ятай про найкоротший список: якщо в UI бракує рядка, `zip` його мовчки пропустить — довжини треба перевіряти окремо.

## Кілька значень з функції

`return a, b` — це повернення кортежу (ти бачив це в модулі Python Basics):

```python
def passed_failed(results):
    passed = results.count("passed")
    return passed, len(results) - passed

ok, bad = passed_failed(["passed", "failed"])
```

## Список чи кортеж?

- **Список** — колекція однорідних елементів, кількість яких змінюється (результати прогону).
- **Кортеж** — запис з фіксованою кількістю полів (один результат: назва, статус, час).

## Типові помилки

- `("smoke")` — це рядок, а не кортеж: потрібна кома `("smoke",)`.
- Кількість змінних не збігається з кількістю значень — `ValueError` при розпакуванні.
- Спроба змінити поле запису (`result[1] = "failed"`) — `TypeError`. Створи новий кортеж: `(name, "failed", duration)`.
- `zip` мовчки обрізає довший список — порівнюй довжини окремо.

## Підсумок

- `tuple` — незмінний; кортеж з одного елемента — `("x",)`.
- Розпакування: `a, b, c = record`, зірочка `first, *rest`; працює й з результатом `split`.
- `for name, status in pairs:` — розпакування прямо в циклі.
- `enumerate` дає (номер, елемент), `zip` — паралельні елементи кількох списків до найкоротшого.
