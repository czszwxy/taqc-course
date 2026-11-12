# Винятки: try, except, raise

У модулі Python Basics ти вчився **читати** traceback. Тепер — обробляти винятки і створювати їх самому. Для QA це подвійно важливо: тестовий код має падати **зрозуміло**, а продукт — правильно відмовляти на погані дані (негативні тести).

## try / except

```python
try:
    price = int(text)
except ValueError:
    price = 0
```

Якщо в блоці `try` стався `ValueError`, Python переходить у `except`, а програма продовжує роботу. Інші винятки (наприклад, `TypeError`) летять далі.

```python
try:
    user = response["user"]
except (KeyError, TypeError) as e:       # кілька типів; e — сам виняток
    print(f"Bad response: {e!r}")
```

Лови **конкретні** винятки, а не все підряд.

> [!WARNING]
> `except:` або `except Exception: pass` ковтає **будь-яку** помилку — разом з `AssertionError` і справжніми багами. Хелпер з таким блоком робить тест зеленим, навіть коли перевірка провалилась. Якщо ловиш виняток — обробляй його або підніми новий з кращим повідомленням.

## else і finally

```python
try:
    response = send_request()
except TimeoutError:
    print("timeout")
else:
    print("ok")                 # лише якщо винятку НЕ було
finally:
    close_connection()          # ЗАВЖДИ: і після помилки, і після return
```

`finally` — місце для прибирання: закрити з'єднання, браузер, видалити тестові дані. Він виконується навіть тоді, коли в `try` або `except` спрацював `return`.

## raise — підняти виняток

```python
def parse_price(text):
    cleaned = text.replace("грн", "").strip()
    if not cleaned.isdigit():
        raise ValueError(f"Invalid price: '{text}'")
    return int(cleaned)
```

Добре повідомлення відповідає на два питання: **що** не так і **яке значення** прийшло. `Invalid price: '12,50 грн'` економить хвилини дебагу порівняно з `invalid literal for int()`.

## Власні винятки

```python
class ApiError(Exception):
    """API повернуло щось, з чим тести не можуть працювати."""
```

Класи детально — у модулі OOP, Files & Project Setup; тут достатньо одного рядка `class ...(Exception)`. Власний тип дозволяє ловити саме «помилки API» окремо від інших.

## raise … from e

Перехопити низькорівневу помилку і підняти зрозумілішу, **не втративши** причину:

```python
try:
    data = json.loads(text)
except json.JSONDecodeError as e:
    raise ApiError(f"Response is not JSON: {text[:30]}") from e
```

У traceback будуть обидві помилки з фразою *The above exception was the direct cause of the following exception*.

## Ієрархія винятків

Винятки утворюють дерево: `KeyError` і `IndexError` — нащадки `LookupError`, а майже всі — нащадки `Exception`. `except LookupError` зловить обидва. Тому порядок `except` має значення: **спершу конкретні**, потім загальніші — інакше загальний перехопить усе раніше.

## Перевірка винятків у тестах: pytest.raises

```python
import pytest

def test_rejects_text():
    with pytest.raises(ValueError, match="Invalid price"):
        parse_price("abc")
```

Тест проходить, якщо код усередині підняв `ValueError` з повідомленням, що відповідає `match` (це регулярний вираз). Якщо винятку не було — тест падає з `DID NOT RAISE`.

> [!QA]
> Негативні тести («система правильно відмовляє») так само важливі, як позитивні. `pytest.raises` з `match` перевіряє не лише сам факт помилки, а й **повідомлення** — саме його побачить колега, який дебажить упалий тест.

## Підсумок

- `try / except Тип` — лови конкретні винятки; `as e` — доступ до винятку.
- `except: pass` ховає баги — не роби так у тестовому коді.
- `else` — якщо винятку не було; `finally` — завжди, навіть після `return`.
- `raise ValueError("що не так: значення")` — повідомлення з контекстом.
- `class MyError(Exception)` — власний тип; `raise New(...) from e` зберігає причину.
- Порядок `except`: конкретні першими. У тестах — `pytest.raises(Тип, match=...)`.
