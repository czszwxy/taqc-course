# Запити: join, агрегати й пагінація

Звіти, фільтри каталогу, сторінки списків — усе це запити з умовами, з'єднаннями й підсумками. Їх можна написати «по-простому»: завантажити все в Python і порахувати циклом. На тестовій базі зі ста рядків це працює, а на мільйоні — забирає пам'ять і секунди. Правило: **рахуй і фільтруй у базі**, у Python забирай лише результат.

Приклади — на бібліотеці: `Member` (читач), `Book`, `Loan` (позика: `member_id`, `book_id`, `fine` — штраф у гривнях, `returned`).

## Окремі стовпці і Row

```python
from sqlalchemy import select

rows = session.execute(select(Book.title, Book.year).where(Book.year < 1950)).all()
for row in rows:
    print(row.title, row.year)          # Row — як кортеж, але й з іменами
titles = session.scalars(select(Book.title)).all()     # один стовпець → список значень
```

## Фільтри

| Вираз | SQL |
|---|---|
| `Book.year.between(1990, 1999)` | `year BETWEEN 1990 AND 1999` |
| `Book.id.in_([1, 2, 3])` / `.not_in(...)` | `id IN (1, 2, 3)` |
| `Book.title.ilike("%python%")` | регістронезалежний `LIKE` |
| `Member.phone.is_(None)` / `.is_not(None)` | `IS NULL` / `IS NOT NULL` |
| `or_(Loan.returned.is_(False), Loan.fine > 0)` | `returned IS false OR fine > 0` |
| `where(a, b)` або `and_(a, b)` | `a AND b` |

`or_` і `and_` імпортують з `sqlalchemy`. Пошуковий рядок від користувача в `ilike(f"%{text}%")` — **не** ін'єкція: значення все одно йде параметром.

## join і outerjoin

```python
stmt = (
    select(Member.name, Book.title)
    .join(Loan, Loan.member_id == Member.id)
    .join(Book, Book.id == Loan.book_id)
    .where(Loan.returned.is_(False))
)
```

Якщо між моделями є `relationship`, умову можна не писати: `.join(Member.loans)`. `join` — внутрішнє з'єднання: читачі без позик зникають. Щоб вони лишились, потрібен `outerjoin`.

## Агрегати і group_by

```python
from sqlalchemy import func

stmt = (
    select(Member.name, func.count(Loan.id).label("loans"), func.coalesce(func.sum(Loan.fine), 0).label("fines"))
    .outerjoin(Loan, Loan.member_id == Member.id)
    .group_by(Member.id)
    .having(func.count(Loan.id) >= 2)
    .order_by(func.count(Loan.id).desc(), Member.name)
)
```

| Частина | Навіщо |
|---|---|
| `func.count(Loan.id)` | рахує лише рядки, де позика **є** |
| `func.coalesce(func.sum(...), 0)` | `SUM` по порожній групі дає `NULL` — замінюємо на 0 |
| `.group_by(Member.id)` | одна група на читача (за ключем, а не за ім'ям — імена повторюються) |
| `.having(...)` | умова на **групу** (після агрегації); `where` — на рядки до неї |
| `.label("loans")` | ім'я стовпця в результаті: `row.loans` |

> [!WARNING]
> З `outerjoin` читач без позик дає один рядок, де всі поля позики — `NULL`. `func.count()` (тобто `COUNT(*)`) порахує цей рядок і покаже **1** позику. `func.count(Loan.id)` пропускає `NULL` і покаже правильний 0.

Одне число — через `session.scalar`: `session.scalar(select(func.count()).select_from(Book))`.

## Пагінація

```python
PAGE_SIZE = 20

def books_page(session, page):
    stmt = select(Book).order_by(Book.title, Book.id).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE)
    return session.scalars(stmt).all()
```

| page | offset | Рядки |
|---|---|---|
| 1 | 0 | 1–20 |
| 2 | 20 | 21–40 |
| 3 | 40 | 41–60 |

- **Без `order_by` пагінація ненадійна**: база не обіцяє порядку, і рядок може потрапити на дві сторінки або на жодну. Додавай унікальний ключ (`id`) останнім у сортуванні.
- Загальну кількість (для «Сторінка 2 з 7») рахують окремим `count` з **тими самими** фільтрами: сторінок = `ceil(total / page_size)`.
- Для дуже глибоких сторінок `offset` повільний; тоді роблять keyset-пагінацію (`WHERE id > останній_id`).

## Подивитися SQL

`print(stmt)` показує SQL, який згенерує вираз, — корисно, коли результат дивний.

## Типові помилки

- Агрегати в Python: `sum(loan.fine for loan in session.scalars(select(Loan)))` — тягне всю таблицю.
- `count()` замість `count(Loan.id)` разом з `outerjoin` — одиниці замість нулів.
- `sum` без `coalesce` — `None` там, де очікували 0.
- Пагінація без `order_by` або сторінка 0 (`offset` від'ємний).
- Загальна кількість без фільтра пошуку — «знайдено 3, сторінок 50».

> [!QA]
> Для звітів і пагінації найцінніші межові дані: група без рядків (читач без позик), рівні значення в сортуванні, остання неповна сторінка, сторінка за межами, пошук без збігів.

## Підсумок
- Стовпці — `select(Model.a, Model.b)` → `session.execute(...).all()`; один стовпець — `scalars`.
- Фільтри — оператори й `in_`, `between`, `ilike`, `is_(None)`, `or_` / `and_`.
- `join` прибирає рядки без пари, `outerjoin` лишає їх; з `outerjoin` рахуй `count(стовпця)`, а суму загортай у `coalesce(..., 0)`.
- `group_by` + агрегати; `having` — умова на групу.
- Пагінація — `order_by` з унікальним ключем + `limit` + `offset = (page - 1) * size` і окремий `count` з тими самими фільтрами.
