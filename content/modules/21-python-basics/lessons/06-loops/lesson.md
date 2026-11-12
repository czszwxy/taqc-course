# Цикли: for і while

Цикл повторює дії для кожного елемента або доки виконується умова. У тестуванні цикли всюди: пройти всі рядки таблиці, перевірити кожен статус-код, повторювати запит, доки замовлення не стане `paid`.

## for

`for` бере елементи **по черзі** з будь-якої послідовності:

```python
results = ["passed", "failed", "passed"]
for result in results:
    print(result)
```

По рядку — посимвольно: `for ch in "QA": print(ch)`.

## range()

`range` дає послідовність чисел:

```python
for i in range(3):          # 0, 1, 2
    print(i)

range(1, 6)                 # 1, 2, 3, 4, 5 — кінець не включно
range(0, 10, 2)             # 0, 2, 4, 6, 8 — крок 2
```

## Накопичення результату

Типовий шаблон: змінна **до** циклу, оновлення **в** циклі, результат **після**:

```python
failed = 0
for result in results:
    if result == "failed":
        failed += 1
print(failed)               # 1
```

## enumerate()

Коли потрібен і елемент, і його номер:

```python
for index, result in enumerate(results):
    print(index, result)    # 0 passed / 1 failed / 2 passed
```

## break і continue

- `break` — вийти з циклу одразу;
- `continue` — перейти до наступного елемента.

```python
for index, result in enumerate(results):
    if result == "failed":
        print("first failure at", index)
        break
```

> [!TIP]
> У функції замість `break` часто зручніше одразу `return` — функція завершиться разом із циклом.

## while

`while` повторює тіло, **доки** умова істинна:

```python
attempt = 0
while attempt < 3:
    attempt += 1
    print("attempt", attempt)
```

> [!WARNING]
> Якщо умова ніколи не стане хибною — цикл нескінченний, і програма «зависне». У `while` обов'язково має змінюватися щось, від чого залежить умова (лічильник, індекс). Задачі в курсі зупиняються через 5 секунд з повідомленням про time limit.

> [!QA]
> `while` з лічильником — основа **очікування** в автотестах: «перевіряй статус замовлення, доки не стане `paid`, але не більше N разів». Саме так працює `expect.poll` у Playwright: повторення з обмеженням, а не нескінченне чекання.

## Підсумок

- `for item in items:` — по черзі кожен елемент; `range(start, stop, step)` — числа без `stop`.
- Шаблон «змінна до циклу → оновлення в циклі → результат після».
- `enumerate()` дає номер і елемент; `break` — вихід, `continue` — пропуск.
- `while` — повтор, доки умова істинна; завжди змінюй те, від чого залежить умова.
