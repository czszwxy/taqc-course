# Python і SQLite: DB-API

Майже кожен бекенд зберігає дані в базі. SQL ти вже знаєш з модуля «SQL for Testers» — тепер навчимося виконувати його **з Python-коду**. У стандартній бібліотеці є модуль `sqlite3`: база SQLite — це один файл (або пам'ять), сервер не потрібен. А головне — `sqlite3` реалізує стандарт **DB-API 2.0** (PEP 249): драйвери PostgreSQL (`psycopg`), MySQL та інших працюють так само, тож навички переносяться.

## Підключення і перший запит

```python
import sqlite3

conn = sqlite3.connect("library.db")      # файл; ":memory:" — база в пам'яті
conn.execute("CREATE TABLE IF NOT EXISTS books (id INTEGER PRIMARY KEY, title TEXT NOT NULL, year INTEGER)")
conn.execute("INSERT INTO books (title, year) VALUES (?, ?)", ("Clean Code", 2008))
conn.commit()

cursor = conn.execute("SELECT id, title, year FROM books WHERE year >= ?", (2000,))
print(cursor.fetchall())                  # [(1, 'Clean Code', 2008)]
conn.close()
```

| Об'єкт / метод | Що робить |
|---|---|
| `sqlite3.connect(path)` | відкриває з'єднання (`Connection`) |
| `conn.execute(sql, params)` | виконує запит, повертає курсор (`Cursor`) |
| `cursor.fetchone()` | наступний рядок-кортеж або `None` |
| `cursor.fetchall()` | усі рядки, що залишились, — список кортежів |
| `for row in cursor:` | рядки по одному, без завантаження всіх у пам'ять |
| `cursor.lastrowid` | `id` щойно вставленого рядка |
| `cursor.rowcount` | скільки рядків змінив `INSERT` / `UPDATE` / `DELETE` |
| `conn.commit()` / `conn.rollback()` | зафіксувати / скасувати зміни |

## Параметри замість f-рядків

Значення у запит **ніколи** не вклеюють f-рядком. Подивись, що станеться:

```python
title = input()                        # користувач ввів:  x' OR '1'='1
conn.execute(f"SELECT * FROM books WHERE title = '{title}'")   # НЕБЕЗПЕЧНО
```

| Що ввів користувач | Який SQL вийде | Результат |
|---|---|---|
| `Clean Code` | `... WHERE title = 'Clean Code'` | як задумано |
| `Head First's Guide` | `... WHERE title = 'Head First's Guide'` | синтаксична помилка через `'` |
| `x' OR '1'='1` | `... WHERE title = 'x' OR '1'='1'` | **усі** книжки — це SQL-ін'єкція |

З параметрами драйвер передає значення окремо від тексту запиту, і воно ніколи не стає частиною SQL:

```python
conn.execute("SELECT * FROM books WHERE title = ?", (title,))              # позиційний ?
conn.execute("SELECT * FROM books WHERE year BETWEEN :start AND :end", {"start": 2000, "end": 2010})   # іменовані
```

> [!WARNING]
> Параметри — це **кортеж** або словник. `(title)` — просто рядок у дужках, а не кортеж: Python спробує передати кожну літеру як окремий параметр. Пиши `(title,)` з комою.

Плейсхолдери замінюють лише **значення**. Назву таблиці чи стовпця параметром не передати (`SELECT * FROM ?` — помилка); якщо назва приходить ззовні, звір її з білим списком дозволених.

## Багато рядків: executemany

```python
new_books = [
    {"title": "Refactoring", "year": 1999},
    {"title": "The Pragmatic Programmer", "year": 1999},
]
conn.executemany("INSERT INTO books (title, year) VALUES (:title, :year)", new_books)
conn.commit()
```

`executemany` виконує той самий запит для кожного елемента. З іменованими плейсхолдерами можна передавати одразу словники.

## Рядки з іменами стовпців

Кортеж `(1, 'Clean Code', 2008)` легко прочитати не тим індексом. Два способи отримати імена:

```python
conn.row_factory = sqlite3.Row            # тепер рядки — sqlite3.Row
row = conn.execute("SELECT id, title FROM books").fetchone()
print(row["title"], dict(row))            # Clean Code {'id': 1, 'title': 'Clean Code'}

cursor = conn.execute("SELECT id, title AS name FROM books")
print([column[0] for column in cursor.description])   # ['id', 'name'] — імена з запиту, з урахуванням AS
```

`row_factory` діє на все з'єднання. `cursor.description` — кортеж описів стовпців останнього запиту; перший елемент кожного опису — ім'я.

## commit і with conn

Зміни (`INSERT` / `UPDATE` / `DELETE`) лежать у відкритій транзакції, доки не викличеш `conn.commit()`. Закрив з'єднання без commit — змін немає. Блок `with conn:` робить commit, якщо все пройшло, і rollback, якщо вилетів виняток:

```python
with conn:                                # commit або rollback
    conn.execute("UPDATE books SET year = ? WHERE id = ?", (2009, 1))
conn.close()                              # with conn НЕ закриває з'єднання
```

## Типові помилки

- f-рядок або `+` для значень у SQL — ін'єкція і зламані запити з апострофом.
- `(email)` замість `(email,)` — параметри не кортеж.
- Забули `commit()` — інший процес (і наступний запуск програми) змін не побачить.
- Думають, що `with conn:` закриває з'єднання — ні, лише керує транзакцією.
- `fetchone()[0]`, коли рядків немає: `fetchone()` повертає `None` → `TypeError`.

> [!QA]
> Для тестів коду з базою зручна `sqlite3.connect(":memory:")`: кожне з'єднання — нова порожня база. А тест на ін'єкцію простий: передай `"' OR '1'='1"` як email — функція має нічого не знайти, а не повернути першого-ліпшого користувача.

## Підсумок
- DB-API однаковий для різних баз: `connect` → `execute(sql, params)` → `fetchone` / `fetchall` → `commit` → `close`.
- Значення — лише через параметри `?` або `:name`; параметри — кортеж `(x,)` або словник.
- `executemany` — один запит для багатьох рядків; `lastrowid` і `rowcount` — що зробив запит.
- Імена стовпців: `conn.row_factory = sqlite3.Row` або `cursor.description`.
- Без `commit()` змін немає; `with conn:` — commit / rollback, але не close.
