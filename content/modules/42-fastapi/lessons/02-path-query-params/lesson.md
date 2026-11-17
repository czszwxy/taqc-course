# Параметри шляху і запиту

API рідко повертає «все і завжди». Клієнт хоче конкретну книжку (`/books/42`) або відфільтрований список (`/books?genre=fantasy&limit=5`). У FastAPI і те, і інше — просто **аргументи функції** з type hints, а перевірку даних фреймворк робить сам.

## Параметри шляху

Частина шляху у фігурних дужках стає аргументом з тією самою назвою:

```python
from fastapi import FastAPI, HTTPException

app = FastAPI()

BOOKS = {
    1: {"id": 1, "title": "Kobzar", "genre": "poetry", "year": 1840},
    2: {"id": 2, "title": "The Hobbit", "genre": "fantasy", "year": 1937},
}

@app.get("/books/{book_id}")
def get_book(book_id: int):
    if book_id not in BOOKS:
        raise HTTPException(status_code=404, detail="Book not found")
    return BOOKS[book_id]
```

У URL усе — текст. Анотація `book_id: int` каже FastAPI: «перетвори `"2"` на `2`». Якщо перетворити не вдається, твоя функція **навіть не викликається** — клієнт одразу отримує `422 Unprocessable Content` з поясненням:

```json
{"detail": [{"type": "int_parsing", "loc": ["path", "book_id"],
             "msg": "Input should be a valid integer, unable to parse string as an integer", "input": "abc"}]}
```

`loc` показує, де помилка (`path` → `book_id`), `msg` — що не так. Це та сама Pydantic-валідація, яку ти бачив(ла) в задачах з контрактами API.

`raise HTTPException(status_code=404, detail="...")` перериває функцію і повертає `{"detail": "Book not found"}` зі статусом 404. Детально про коди й помилки — в уроці 4; поки запам'ятай: «не знайшов — 404».

## Параметри запиту

Аргумент, якого **немає** в шляху, FastAPI шукає в рядку запиту після `?`:

```python
@app.get("/books")
def list_books(genre: str | None = None, year_from: int = 0, available: bool = False):
    found = [b for b in BOOKS.values() if b["year"] >= year_from]
    if genre is not None:
        found = [b for b in found if b["genre"] == genre]
    return found
```

| Запит | Що отримає функція |
|---|---|
| `/books` | `genre=None, year_from=0, available=False` — значення за замовчуванням |
| `/books?genre=fantasy` | `genre="fantasy"` |
| `/books?year_from=1900` | `year_from=1900` (вже `int`) |
| `/books?available=true` | `True`; також `1`, `yes`, `on`. `false`, `0`, `no`, `off` — `False` |
| `/books?year_from=old` | функція не викликається, `422` |
| `/books?color=red` | невідомий параметр просто **ігнорується** |

- Є значення за замовчуванням — параметр **необов'язковий**.
- Без значення за замовчуванням (`genre: str`) — **обов'язковий**: без нього `422` «Field required».
- `str | None = None` — класичний «необов'язковий фільтр»: `None` означає «не фільтрувати».

## Перевірки: Query і Path

Тип — це лише перша перевірка. Межі значень додають через `Annotated`:

```python
from typing import Annotated
from fastapi import Path, Query

@app.get("/books/{book_id}/reviews")
def list_reviews(
    book_id: Annotated[int, Path(gt=0)],
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    author: Annotated[str | None, Query(min_length=2, max_length=40)] = None,
):
    ...
```

| Перевірка | Значення |
|---|---|
| `gt` / `ge` | більше / більше або дорівнює |
| `lt` / `le` | менше / менше або дорівнює |
| `min_length` / `max_length` | довжина рядка |
| `pattern` | регулярний вираз для рядка |

`/books/0/reviews` і `/books/5/reviews?limit=500` отримають `422` — функцію не викличе ніхто. Межі потрапляють і в Swagger UI: клієнт бачить контракт.

> [!TIP]
> Обмежуй `limit` завжди. Без `le=` хтось попросить `?limit=1000000` — і твій сервер піде вантажити мільйон рядків.

## Фіксований набір значень: Enum

```python
from enum import StrEnum

class Format(StrEnum):
    paper = "paper"
    ebook = "ebook"
    audio = "audio"

@app.get("/formats/{fmt}")
def books_in_format(fmt: Format):
    return {"format": fmt, "is_ebook": fmt is Format.ebook}
```

`/formats/vinyl` → `422` з повідомленням «Input should be 'paper', 'ebook' or 'audio'», а Swagger UI покаже випадаючий список.

## Порядок маршрутів має значення

FastAPI перевіряє маршрути **зверху вниз** і бере перший, що підходить:

```python
@app.get("/books/popular")      # ✅ оголошено раніше — /books/popular потрапить сюди
def popular_books(): ...

@app.get("/books/{book_id}")    # /books/7 — сюди
def get_book(book_id: int): ...
```

Якби `/books/{book_id}` стояв вище, запит `/books/popular` спробував би перетворити `"popular"` на `int` і отримав би `422`. Правило: **конкретні шляхи — вище за шляхи з параметрами**.

## Типові помилки

| Помилка | Наслідок |
|---|---|
| Назва в шляху й аргументі різна: `{id}` і `book_id` | `book_id` стає обов'язковим query-параметром — кожен запит отримує 422 «Field required» з `loc: ["query", "book_id"]` |
| Фільтр без `None`: `genre: str` | без `?genre=` кожен запит — 422 |
| Перевірка `if limit > 50` вручну | працює, але не видно в Swagger UI; краще `Query(le=50)` |
| `return None` замість 404 | клієнт отримує `200` і `null` — «знайдено нічого» |

> [!QA]
> Ці перевірки — готовий список тестів: межі (`limit=1`, `50`, `51`, `0`), неправильний тип (`abc`), відсутній обов'язковий параметр, невідомий параметр (ігнорується!) і неіснуючий id (404). Добрий бекенд-розробник пише їх сам(а), ще до тестувальника.

## Підсумок

- `{name}` у шляху → аргумент `name`; решта аргументів — параметри запиту `?name=`.
- Type hints перетворюють текст на `int`, `bool`, `Enum`; невдале перетворення — `422`, функція не викликається.
- Значення за замовчуванням робить параметр необов'язковим; `X | None = None` — фільтр «за бажанням».
- `Annotated[int, Query(ge=1, le=50)]`, `Path(gt=0)` — межі значень у контракті.
- Конкретні маршрути оголошуй вище за маршрути з параметрами; «не знайдено» — `HTTPException(404)`.
