# SQLAlchemy ORM: моделі, Session і select

Писати SQL рядками і вручну перетворювати кортежі `(1, "Clean Code", 2008)` на об'єкти — втомлює і веде до помилок. **ORM** (Object-Relational Mapper) зв'язує таблицю з класом Python: рядок таблиці — об'єкт, стовпець — атрибут. **SQLAlchemy** — найпоширеніша ORM у Python: її беруть у FastAPI- і Flask-проєктах, скриптах і сервісах даних. У цьому уроці — сучасний стиль **SQLAlchemy 2.0** (саме його показує офіційна документація; старий `session.query(...)` ти ще побачиш у легасі-коді).

## Дві частини SQLAlchemy

| Частина | Що це | Коли |
|---|---|---|
| **Core** | SQL-вирази на Python: `select(...)`, `insert(...)`, об'єкти таблиць | складні звіти, масові операції |
| **ORM** | класи-моделі, `Session`, об'єкти | звичайна логіка застосунку |

ORM побудована на Core: `select(Book)` — той самий вираз Core, лише результатом стають об'єкти `Book`.

## Engine — точка підключення

```python
from sqlalchemy import create_engine

engine = create_engine("sqlite://")                          # БД у пам'яті
# engine = create_engine("sqlite:///library.db")             # файл library.db
# engine = create_engine("postgresql+psycopg://app:secret@localhost/library")
```

URL описує **діалект** (`sqlite`, `postgresql`), **драйвер** (`psycopg`) і де лежить база. Engine — довгоживучий об'єкт: **один на застосунок**, він тримає пул з'єднань. `create_engine(..., echo=True)` друкує кожен SQL-запит — найкращий спосіб побачити, що насправді робить ORM.

## Модель — клас, що описує таблицю

```python
from sqlalchemy import String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(primary_key=True)
    isbn: Mapped[str] = mapped_column(String(13), unique=True)
    title: Mapped[str] = mapped_column(String(200))
    year: Mapped[int | None]
    available: Mapped[bool] = mapped_column(default=True)
```

| Запис | Що з'явиться в таблиці |
|---|---|
| `Mapped[int]` | стовпець `INTEGER NOT NULL` |
| `Mapped[int \| None]` | той самий тип, але **може бути NULL** |
| `mapped_column(primary_key=True)` | первинний ключ; значення `id` дасть база |
| `String(13)` | `VARCHAR(13)` |
| `unique=True` | обмеження `UNIQUE` |
| `default=True` | значення, яке SQLAlchemy підставить в `INSERT`, якщо атрибут не задано |
| рядок без `mapped_column` | тип і NULL беруться лише з анотації |

`Base` — спільний предок усіх моделей, а `Base.metadata` знає про всі їхні таблиці. `Base.metadata.create_all(engine)` створює таблиці, **яких ще немає**. Наявну таблицю вона не змінює — для цього є міграції (урок 08).

## Session — розмова з базою

```python
from sqlalchemy.orm import Session

with Session(engine) as session:
    book = Book(isbn="9780000000001", title="Clean Code", year=2008)
    session.add(book)
    print(book.id)        # None — у базі його ще немає
    session.commit()
    print(book.id)        # 1 — INSERT виконано, ключ отримано
```

Session — це **unit of work**: ти додаєш і змінюєш об'єкти, а SQL збирається і надсилається під час **flush** — перед наступним запитом або в `commit()`. `commit()` фіксує транзакцію. Вихід з `with` закриває сесію: усе незафіксоване відкочується.

| Метод | Що робить |
|---|---|
| `session.add(obj)` / `session.add_all([...])` | додати нові об'єкти |
| `session.get(Book, 1)` | знайти за первинним ключем або повернути `None` |
| `session.delete(obj)` | позначити на видалення |
| `session.flush()` | надіслати накопичені зміни в БД (без commit) |
| `session.commit()` | flush + зафіксувати транзакцію |
| `session.rollback()` | скасувати незафіксоване |

Змінити запис — просто змінити атрибут: `book.available = False`, потім `session.commit()`. Сесія сама помітить «брудний» об'єкт і виконає `UPDATE books SET available=? WHERE id=?`.

## Стани об'єкта

| Стан | Як потрапити | Що це означає |
|---|---|---|
| transient | `Book(...)` | звичайний об'єкт, сесія про нього не знає |
| pending | `session.add(book)` | чекає на flush, `id` ще `None` |
| persistent | після flush / завантажений запитом | є рядок у БД, сесія стежить за змінами |
| detached | після `session.close()` | рядок є, але сесії вже немає |

Після `commit()` атрибути об'єктів **«протухають»** (`expire_on_commit=True`): наступне звернення до `book.title` зробить свіжий `SELECT`. Це гарантує, що ти не бачиш застарілих даних.

## select — запити

```python
from sqlalchemy import select

stmt = select(Book).where(Book.year >= 2000).order_by(Book.title)
books = session.scalars(stmt).all()                         # list[Book]

found = session.scalars(select(Book).where(Book.isbn == "9780000000001")).first()   # Book | None
```

| Виклик | Що повертає |
|---|---|
| `session.scalars(stmt).all()` | список об'єктів |
| `session.scalars(stmt).first()` | перший об'єкт або `None` |
| `session.scalars(stmt).one()` | рівно один, інакше виняток |
| `session.scalar(stmt)` | перше значення першого рядка (зручно для `count`) |
| `session.execute(stmt).all()` | рядки-кортежі (коли вибираєш кілька стовпців) |

Умови пишуть операторами Python: `Book.year >= 2000`, `Book.title.like("%Python%")`, `Book.year.is_(None)`, `Book.id.in_([1, 2])`. Кілька умов у `where(a, b)` з'єднуються через `AND`; `order_by(Book.year.desc(), Book.title)` — сортування за кількома ключами; `.limit(3)` — обмеження. Значення стають **параметрами** запиту, тож SQL-ін'єкції немає.

## Identity map: один рядок — один об'єкт

У межах однієї сесії `session.get(Book, 1) is session.get(Book, 1)` — `True`: сесія пам'ятає завантажені об'єкти за первинним ключем, і другий `get` навіть не йде в базу.

## Типові помилки

- Забули `commit()` — після закриття сесії даних немає.
- `session.scalars(stmt)` без `.all()` / `.first()` — це ітератор результатів, а не список.
- `session.execute(select(Book)).all()` замість `scalars` — отримаєш кортежі `(Book,)`, а не книжки.
- `if Book.year > 2000:` — це SQL-вираз, а не `bool`; умови пишуть у `where(...)`.
- `.first()` там, де рядків багато, без `order_by` — «перший» може бути будь-який.

> [!QA]
> Код з базою зручно тестувати на SQLite у пам'яті: `create_engine("sqlite://")` + `create_all` — і кожен тест отримує чисту базу за мілісекунди. Але SQLite відрізняється від PostgreSQL (типи, регістр у `LIKE`, конкурентний доступ), тож для важливих перевірок у CI тести запускають і на тій самій СУБД, що в продакшені.

## Підсумок
- Engine — одне підключення-пул на застосунок; URL задає діалект, драйвер і базу; `echo=True` показує SQL.
- Модель = клас від `DeclarativeBase` з `__tablename__`; `Mapped[T]` — NOT NULL, `Mapped[T | None]` — може бути NULL; деталі — у `mapped_column(...)`.
- Session — unit of work: `add` → flush (INSERT / UPDATE) → `commit`; зміна атрибута + commit = UPDATE.
- Запити: `select(Model).where(...).order_by(...)`, результати — `session.scalars(...).all()` / `.first()`, за ключем — `session.get`.
- `create_all` створює лише відсутні таблиці; зміни схеми — міграціями.
