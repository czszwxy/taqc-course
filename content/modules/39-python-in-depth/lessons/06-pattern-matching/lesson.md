# Pattern matching: match / case

Бекенд постійно розбирає дані різної форми: команди, маршрути, події з вебхуків, повідомлення з черги. Довгі ланцюжки `if / elif` з перевірками `len(...)`, `isinstance(...)` і `"key" in data` важко читати. `match / case` (Python 3.10+) зіставляє значення зі **структурою** і одразу витягує потрібні частини в змінні.

## Літерали, | і _

```python
def status_text(code):
    match code:
        case 200 | 201 | 204:
            return "success"
        case 404:
            return "not found"
        case 500 | 502 | 503:
            return "server error"
        case _:
            return "other"
```

`|` — «або», `_` — «що завгодно» (запасний варіант). Спрацьовує **перший** `case`, що підійшов, — далі Python не дивиться.

## Послідовності й захоплення

```python
def deploy_command(words):
    match words:
        case ["deploy", env]:
            return f"deploy to {env}"
        case ["deploy", env, *flags]:
            return f"deploy to {env} with {flags}"
        case ["rollback", env, version]:
            return f"rollback {env} to {version}"
        case ["status"]:
            return "show status"
        case _:
            return "unknown command"
```

## Розбір: як Python перевіряє case

`deploy_command(["deploy", "prod", "--force"])`:

| `case` | Перевірка | Результат |
|---|---|---|
| `["deploy", env]` | список рівно з 2 елементів? — ні, їх 3 | далі |
| `["deploy", env, *flags]` | ≥ 2 елементи, перший `"deploy"`? — так | `env = "prod"`, `flags = ["--force"]` |
| — | тіло цього case виконано, решту пропущено | `'deploy to prod with ['--force']'` |

Рядок у патерні (`"deploy"`) — літерал для порівняння. Ім'я (`env`) — **змінна, яку заповнять** тим, що стоїть на цьому місці. `*flags` збирає «решту» в список (можливо, порожній). Рядки й байти Python як послідовність не розбирає: `case [a, b]` не підійде до `"ab"`.

## Словники

```python
match event:
    case {"type": "user.created", "email": email}:
        send_welcome(email)
    case {"type": "user.deleted", "id": user_id}:
        archive(user_id)
```

Словниковий патерн перевіряє, що **потрібні ключі є** й значення підходять; зайві ключі ігноруються (решту можна зібрати через `**rest`).

## Класи й типи

```python
from dataclasses import dataclass


@dataclass
class Point:
    x: int
    y: int


def where(point):
    match point:
        case Point(x=0, y=0):
            return "origin"
        case Point(x=0, y=y):
            return f"on the Y axis at {y}"
        case Point(x, y) if x == y:            # позиційно — завдяки dataclass
            return "on the diagonal"
        case _:
            return "somewhere else"
```

`Point(x=0)` перевіряє `isinstance(value, Point)` і атрибут. Позиційні `Point(x, y)` працюють, бо dataclass сам задає `__match_args__ = ("x", "y")`. Для вбудованих типів: `case int(n)` — «ціле число, назви його `n`», `case str() | bytes()` — «рядок або байти».

## Умови: if у case

`case ["add", sku, qty] if qty.isdigit():` — патерн підійшов **і** умова істинна. Якщо умова хибна, Python переходить до наступного `case`.

## Пастка: голе ім'я — це не порівняння

```python
PAID = "paid"
match status:
    case PAID:          # НЕ порівнює з "paid"! Захоплює будь-що в змінну PAID
        ...
```

Голе ім'я завжди **захоплює** значення, тому такий `case` спрацює для будь-якого статусу. Якщо після нього є інші `case`, Python навіть не запустить код: `SyntaxError: name capture 'PAID' makes remaining patterns unreachable`. А якщо він останній — помилка тиха. Для порівняння з константою потрібне ім'я з крапкою: `case OrderStatus.PAID:` або літерал `case "paid":`.

## match чи if / elif

| Ситуація | Що краще |
|---|---|
| розбір структур: списки команд, JSON-події, кортежі `(method, path)` | `match` |
| вибір дії за одним значенням з багатьох | словник «значення → функція» або `match` |
| дві-три прості умови з порівняннями `<`, `>` | `if / elif` |

## Типові помилки

- `case STATUS:` з голим ім'ям — захоплює все, а не порівнює.
- Загальніший `case` вище за конкретний — конкретний ніколи не спрацює.
- Чекати, що словниковий патерн вимагає **рівно** ці ключі — зайві ігноруються.
- `case int(x)` для `"42"` з JSON — рядок не є `int`, патерн не підійде.
- Забути `case _:` — для невідомих даних функція мовчки поверне `None`.

## Підсумок

- `match` перевіряє `case` згори вниз і виконує перший, що підійшов.
- Літерали і `|` порівнюють, імена захоплюють, `_` — будь-що, `*rest` / `**rest` — решта.
- Словникові патерни вимагають наявності ключів, але не забороняють інші.
- Класові патерни перевіряють тип і атрибути; dataclass дає позиційні патерни.
- `if` у `case` — додаткова умова; константи — лише через ім'я з крапкою.
