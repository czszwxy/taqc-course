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

Кількість змінних має збігатися з кількістю елементів, інакше `ValueError: too many values to unpack`.

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

## Підсумок

- `tuple` — незмінний; кортеж з одного елемента — `("x",)`.
- Розпакування: `a, b, c = record`, зірочка `first, *rest`.
- `for name, status in pairs:` — розпакування прямо в циклі.
- `enumerate` дає (номер, елемент), `zip` — паралельні елементи кількох списків до найкоротшого.
