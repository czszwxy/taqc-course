# Функції

Функція — це іменований шматок коду, який приймає дані (параметри) і повертає результат. В автотестах функції всюди: хелпер логіну, побудова URL, підготовка тестових даних. Тести pytest — це теж функції.

## Оголошення і виклик

```python
def full_name(first, last):
    """Return the full name for reports."""
    return first + " " + last

print(full_name("Olena", "Tester"))     # Olena Tester
```

- `first`, `last` — **параметри** (імена в оголошенні);
- `"Olena"`, `"Tester"` — **аргументи** (значення при виклику);
- рядок у потрійних лапках одразу після `def` — **docstring**, опис функції.

## return

`return` повертає значення і **завершує** функцію. Без `return` функція повертає `None`.

```python
def double(x):
    print(x * 2)        # лише показує

result = double(5)      # друкує 10
print(result)           # None
```

> [!IMPORTANT]
> Тест перевіряє `return`, а не `print`. Функція, що друкує, але нічого не повертає, — найчастіша причина «тест падає, хоча на екрані все правильно».

## Значення за замовчуванням

```python
def build_url(base, path, page=1):
    return f"{base}/{path}?page={page}"

build_url("https://shop.test", "products")           # page=1
build_url("https://shop.test", "products", 3)        # page=3
```

Параметри зі значенням за замовчуванням ідуть **після** обов'язкових.

## Іменовані аргументи

```python
build_url("https://shop.test", "products", page=2)
build_url(path="orders", base="https://shop.test")     # порядок не важливий
```

Іменовані аргументи роблять виклики зрозумілими: `create_user(name="Olena", admin=False)` читається краще, ніж `create_user("Olena", False)`.

## Кілька значень

Функція може повернути кілька значень — насправді це **tuple** (кортеж):

```python
def passed_failed(results):
    passed = results.count("passed")
    return passed, len(results) - passed

ok, bad = passed_failed(["passed", "failed", "passed"])   # 2, 1
```

## Чисті функції

**Чиста функція** залежить лише від своїх параметрів і нічого не змінює навколо (не друкує, не пише у файли, не змінює глобальні змінні). Такі функції найлегше тестувати: однакові аргументи — однаковий результат.

> [!QA]
> Коли пишеш хелпери для автотестів, роби їх чистими там, де можна: `build_url`, `format_price`, `expected_total` — і їх можна перевірити окремими маленькими тестами.

## Підсумок

- `def name(params):` + тіло з відступом + `return`; docstring описує функцію.
- `return` повертає значення і завершує функцію; без нього — `None`.
- Значення за замовчуванням — після обов'язкових параметрів; іменовані аргументи — для читабельності.
- `return a, b` повертає tuple, який можна розпакувати.
