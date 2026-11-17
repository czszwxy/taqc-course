# Зв'язки і проблема N+1

У схемі зв'язок — це зовнішній ключ. У SQLAlchemy його ще й «оживляють»: `author.books` — список книжок автора, `book.author` — автор книжки, без жодного JOIN у твоєму коді. Це зручно — і саме тут ховається найчастіша проблема продуктивності ORM: **N+1 запит**.

## Один-до-багатьох

```python
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

class Author(Base):
    __tablename__ = "authors"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    books: Mapped[list["Book"]] = relationship(back_populates="author", cascade="all, delete-orphan")

class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id"))
    author: Mapped["Author"] = relationship(back_populates="books")
```

| Частина | Рівень | Що дає |
|---|---|---|
| `mapped_column(ForeignKey("authors.id"))` | база | стовпець `author_id` з посиланням на `authors.id` |
| `relationship(...)` | Python | атрибут для навігації: `author.books`, `book.author` |
| `back_populates="author"` | Python | дві сторони синхронізуються одразу, ще до запису в базу |
| `Mapped[list["Book"]]` | Python | «багато» — список; `Mapped["Author"]` — один об'єкт |

Лапки в `"Book"` — бо клас `Book` оголошено нижче. `back_populates` вказують з **обох** боків, і кожен називає атрибут іншого.

```python
tolkien = Author(name="J. R. R. Tolkien", books=[Book(title="The Hobbit")])
tolkien.books.append(Book(title="The Silmarillion"))
session.add(tolkien)          # книжки збережуться разом з автором (каскад save-update)
session.commit()              # author_id у книжок заповнить SQLAlchemy
```

## Каскади

`cascade` описує, що робити з «дітьми», коли щось відбувається з «батьком»:

| Значення | Що станеться |
|---|---|
| за замовчуванням (`save-update, merge`) | нові діти зберігаються разом з батьком; при видаленні батька SQLAlchemy намагається поставити дітям `author_id = NULL` |
| `"all"` | ще й `delete`: видалили автора — видалились його книжки |
| `"all, delete-orphan"` | ще й «сироти»: прибрали книжку зі списку `author.books` — вона видаляється |

`delete-orphan` доречний, коли дитина без батька не має сенсу (рядки замовлення, книжки в цьому прикладі). Для самостійних сутностей (покупець і його відгуки, що мають лишитися) каскад видалення не ставлять.

## Багато-до-багатьох

Сполучну таблицю описують через `Table`, а у `relationship` передають `secondary`:

```python
from sqlalchemy import Column, Table

book_genres = Table(
    "book_genres",
    Base.metadata,
    Column("book_id", ForeignKey("books.id"), primary_key=True),
    Column("genre_id", ForeignKey("genres.id"), primary_key=True),
)

class Genre(Base):
    __tablename__ = "genres"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    books: Mapped[list["Book"]] = relationship(secondary=book_genres, back_populates="genres")

# у класі Book:
#     genres: Mapped[list["Genre"]] = relationship(secondary=book_genres, back_populates="books")
```

`book.genres.append(fantasy)` додає рядок у `book_genres`, `book.genres.remove(fantasy)` — видаляє його. Сама таблиця `book_genres` у коді майже не з'являється.

## Проблема N+1

За замовчуванням зв'язок **лінивий** (`lazy="select"`): `author.books` завантажується окремим `SELECT` при першому зверненні.

```python
authors = session.scalars(select(Author)).all()          # 1 запит
for author in authors:
    print(author.name, len(author.books))                 # + 1 запит на КОЖНОГО автора
```

| Авторів | Запитів |
|---|---|
| 3 | 1 + 3 = 4 |
| 100 | 1 + 100 = 101 |
| 10 000 | 10 001 — сторінка відкривається секунди |

На тестовій базі з трьома авторами нічого не видно, а в продакшені сторінка «лягає». Рішення — сказати заздалегідь, що зв'язок знадобиться (**eager loading**):

```python
from sqlalchemy.orm import joinedload, selectinload

authors = session.scalars(select(Author).options(selectinload(Author.books))).all()   # рівно 2 запити
books = session.scalars(select(Book).options(joinedload(Book.author))).all()          # 1 запит з JOIN
```

| Стратегія | Як працює | Коли |
|---|---|---|
| `selectinload` | другий запит `... WHERE author_id IN (1, 2, 3, ...)` | колекції (`author.books`) — найкращий вибір за замовчуванням |
| `joinedload` | `LEFT OUTER JOIN` в основному запиті | «один» бік (`book.author`) |
| `lazy="raise"` / `raiseload` | помилка при випадковому лінивому завантаженні | щоб N+1 не прослизнув непомітно |

## Як побачити запити

`create_engine(url, echo=True)` друкує кожен запит. У тестах їх зручно **рахувати** подією `before_cursor_execute`:

```python
from sqlalchemy import event

statements = []
event.listen(engine, "before_cursor_execute", lambda conn, cursor, statement, *rest: statements.append(statement))
# ... виклик коду ...
assert len(statements) <= 2, statements
```

## Типові помилки

- `back_populates` лише з одного боку або з неправильною назвою — помилка під час налаштування моделей.
- `relationship` без `ForeignKey` — SQLAlchemy не знає, як з'єднати таблиці.
- Видалення батька без каскаду, коли `author_id` обов'язковий: SQLAlchemy ставить `NULL` → `IntegrityError`.
- Цикл по об'єктах із зверненням до зв'язку — у шаблоні, серіалізаторі, звіті — без `selectinload`.
- Той самий об'єкт додали в колекцію багато-до-багатьох двічі — дубль у сполучній таблиці.

> [!QA]
> N+1 не ловиться функціональними тестами: результат правильний, просто повільний. Тест, що **рахує запити** на 30 записах, ловить його одразу — і захищає від регресії, коли хтось додасть у звіт ще одне поле зі зв'язку.

## Підсумок
- `ForeignKey` — зв'язок у базі, `relationship` — навігація в Python; `back_populates` з обох боків.
- Колекція — `Mapped[list["Child"]]`, один об'єкт — `Mapped["Parent"]`.
- `cascade="all, delete-orphan"` — діти видаляються з батьком і при вилученні зі списку.
- Багато-до-багатьох — `Table` зі складеним ключем і `relationship(secondary=...)`.
- Лінивий зв'язок у циклі = N+1; лікується `selectinload` (колекції) або `joinedload` (один бік); у тестах рахуй запити.
