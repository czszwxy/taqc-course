# QuerySet: запити до бази

Кожна модель має **менеджер** `objects`, а він повертає **QuerySet** — опис запиту, який Django перетворить на SQL. Ти пишеш Python, а не SQL, але думати треба так само, як у модулі про SQL: що відфільтрувати, як згрупувати, скільки запитів піде в базу.

## Основні методи

Приклад — бібліотека з моделями `Author`, `Book` (поля `title`, `pages`, `status`, `author`) і `Loan` (`book`, `member`, `returned_at`):

```python
Book.objects.all()                                    # усі
Book.objects.filter(status=Book.Status.AVAILABLE)     # WHERE status = 'available'
Book.objects.exclude(pages__lt=100)                   # WHERE NOT pages < 100
Book.objects.get(isbn="9786170000001")                # рівно один об'єкт
Book.objects.filter(pages__gte=300).order_by("-pages", "title")[:5]
```

`get()` повертає **один** об'єкт або піднімає виняток: `Book.DoesNotExist`, якщо нічого немає, і `Book.MultipleObjectsReturned`, якщо знайшлося кілька. Для «може не бути» є `filter(...).first()` — він поверне `None`.

## Умови через подвійне підкреслення

| Умова | Значення |
|---|---|
| `pages__gt=300`, `__gte`, `__lt`, `__lte` | порівняння |
| `title__icontains="kobzar"` | містить, без урахування регістру |
| `isbn__startswith="978"` | починається з |
| `status__in=["available", "on_loan"]` | одне зі значень |
| `returned_at__isnull=True` | `IS NULL` |
| `added_at__year=2026`, `added_at__date=date(2026, 5, 1)` | частина дати |
| `author__name="Lesya Ukrainka"` | поле **пов'язаної** моделі (JOIN робить Django) |

Зворотний зв'язок теж працює: `Author.objects.filter(books__pages__gt=500).distinct()` — автори, в яких є товсті книжки (`distinct()` прибирає дублікати, якщо таких книжок кілька).

## Q: «або» і «не»

Кілька умов у `filter()` з'єднуються через «і». Для «або» потрібен `Q`:

```python
from django.db.models import Q

Book.objects.filter(Q(title__icontains=text) | Q(author__name__icontains=text))
Book.objects.filter(~Q(status=Book.Status.ON_LOAN))     # «не»
```

## F: значення іншого поля

```python
from django.db.models import F

Book.objects.filter(read_count__gt=F("copies") * 10)              # порівняти два поля рядка
Book.objects.filter(pk=book_id).update(copies=F("copies") - 1)    # зменшити в базі, без гонки
```

`update(copies=F("copies") - 1)` виконується одним SQL `UPDATE ... SET copies = copies - 1`: якщо два запити прийдуть одночасно, жодне зменшення не загубиться. Варіант «прочитав → `book.copies -= 1` → `save()`» може загубити одне з них.

## Підсумки: aggregate і annotate

```python
from django.db.models import Count, Sum
from django.db.models.functions import Coalesce

Book.objects.aggregate(total_pages=Sum("pages"))            # {'total_pages': 12345} — одне число на весь запит

authors = Author.objects.annotate(
    books_count=Count("books"),
    available=Count("books", filter=Q(books__status="available")),
    pages=Coalesce(Sum("books__pages"), 0),
).order_by("name")
authors[0].books_count                                       # число для КОЖНОГО автора
```

- `aggregate` — один підсумок на всю вибірку (словник).
- `annotate` — підсумок для кожного рядка (GROUP BY); автори без книжок теж потрапляють (LEFT JOIN): `Count` дасть 0, а `Sum` — `None`, тому `Coalesce(..., 0)`.
- `filter=Q(...)` усередині агрегату рахує лише частину зв'язаних рядків.
- Назва анотації не може збігатися з полем чи `related_name` моделі (`books=Count("books")` — помилка).

`values("title", "pages")` повертає словники, `values_list("title", flat=True)` — плаский список значень.

## QuerySet лінивий

Поки QuerySet не потрібен, запит не виконується:

```python
qs = Book.objects.filter(pages__gt=300)    # 0 запитів
qs = qs.exclude(status="on_loan")          # 0 — лише уточнили опис
for book in qs: ...                        # 1 запит — тут
for book in qs: ...                        # 0 — результат уже в кеші цього qs
Book.objects.count()                       # 1
```

Запит виконується, коли QuerySet перебирають, перетворюють на `list`, беруть `len()`, `bool()`, а також `get()`, `first()`, `count()`, `exists()`, `aggregate()`, `update()`, `delete()`. Зріз `[:5]` сам по собі лишається лінивим.

## N+1 і як його прибрати

```python
for loan in Loan.objects.all():            # 1 запит
    print(loan.book.title)                 # + 1 запит на КОЖНУ позику
```

| Інструмент | Для зв'язку | Як працює |
|---|---|---|
| `select_related("book", "book__author")` | «вперед» по `ForeignKey` | один запит з JOIN |
| `prefetch_related("books")` | «назад» по `ForeignKey`, `ManyToMany` | ще один запит `WHERE ... IN (...)` |

```python
Loan.objects.select_related("book__author")                        # 1 запит
Author.objects.prefetch_related("books")                           # 2 запити на будь-яку кількість авторів
Author.objects.prefetch_related(Prefetch("books", queryset=Book.objects.order_by("title")))
```

> [!WARNING]
> Після `prefetch_related("books")` пиши `author.books.all()`. Виклик `author.books.filter(...)` чи `.order_by(...)` — це **новий** запит, і N+1 повертається. Потрібен інший порядок — передай його через `Prefetch(..., queryset=...)`.

## Типові помилки

| Помилка | Наслідок |
|---|---|
| `get()` там, де може не бути об'єкта | `DoesNotExist` → `500` |
| `filter(a) | filter(b)` замість `Q` | працює, але легко помилитися з дужками; для «або» — `Q` |
| `len(qs)` лише щоб порахувати | вантажить усі рядки; бери `count()` |
| Підсумок у циклі Python | N запитів замість одного `annotate` |
| `obj.field += 1; obj.save()` для лічильників | губляться одночасні зміни; бери `F` |

> [!QA]
> Кількість запитів — частина поведінки. pytest-django має фікстури `django_assert_num_queries(n)` і `django_assert_max_num_queries(n)`: тест з 30 об'єктами і межею «не більше 3 запитів» ловить N+1 раніше за повільну сторінку в продакшні.

## Підсумок

- `filter` / `exclude` / `get` / `order_by` / зрізи; `get` — рівно один об'єкт або виняток.
- Умови `поле__lookup=значення`, через зв'язки — `author__name`.
- `Q` — «або» / «не», `F` — значення поля в запиті й атомарні `update`.
- `aggregate` — одне число, `annotate` — число на кожен рядок; `Coalesce` для порожніх сум.
- QuerySet лінивий; N+1 прибирають `select_related` (вперед) і `prefetch_related` (назад, M2M).
