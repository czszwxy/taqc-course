# Моделі й міграції

У модулі про SQLAlchemy ти описував(ла) таблиці класами. Django робить те саме своїм ORM: **модель** — клас-нащадок `models.Model`, кожен атрибут-поле — стовпець. Але Django ще й сам пише **міграції** — файли змін схеми, — і будує з моделей адмінку та форми.

## Перша модель

Приклад — бібліотека:

```python
from django.db import models
from django.db.models import Q

class Author(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)

    def __str__(self):
        return self.name

class Book(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = "available", "Available"
        ON_LOAN = "on_loan", "On loan"

    author = models.ForeignKey(Author, on_delete=models.PROTECT, related_name="books")
    title = models.CharField(max_length=200)
    isbn = models.CharField(max_length=13, unique=True)
    pages = models.PositiveIntegerField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.AVAILABLE)
    summary = models.TextField(blank=True)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["title"]
        constraints = [
            models.CheckConstraint(condition=Q(pages__gte=1), name="book_pages_positive"),
        ]

    def __str__(self):
        return f"{self.title} ({self.isbn})"
```

`id` додавати не треба: Django створює первинний ключ сам (`BigAutoField`). Назва таблиці — `<застосунок>_<модель>`: `library_book`.

## Поля і їхні параметри

| Поле | Для чого |
|---|---|
| `CharField(max_length=...)` | короткий текст; `max_length` обов'язковий |
| `TextField` | довгий текст |
| `IntegerField`, `PositiveIntegerField` | цілі (друге — `>= 0` на рівні бази) |
| `DecimalField(max_digits=, decimal_places=)` | гроші, якщо потрібні копійки (не `FloatField`!) |
| `BooleanField(default=False)` | так / ні |
| `DateTimeField(auto_now_add=True)` | момент створення; `auto_now=True` — момент останньої зміни |
| `SlugField`, `EmailField`, `URLField` | рядки з перевіркою формату у формах |

| Параметр | Значення |
|---|---|
| `null=True` | у базі можна `NULL` |
| `blank=True` | у **формах** поле можна лишити порожнім (на базу не впливає) |
| `default=...` | значення, якщо не задано |
| `unique=True` | унікальність — обмеження в базі |
| `choices=...` | дозволені значення (у формах і адмінці — випадаючий список) |

> [!TIP]
> Для текстових полів у Django прийнято `blank=True` **без** `null=True`: «порожньо» — це порожній рядок `""`, а не `NULL`. Інакше в базі буде два різні «нічого».

`TextChoices` описує набір значень один раз: `Book.Status.ON_LOAN` дорівнює `"on_loan"`, а `"On loan"` — підпис для людей. У коді порівнюй з константою, а не з рядком.

## Зв'язки

```python
author = models.ForeignKey(Author, on_delete=models.PROTECT, related_name="books")
```

- `author.books.all()` — книжки автора (ім'я задає `related_name`; без нього — `author.book_set`).
- `on_delete` — що робити з книжками, коли видаляють автора:

| `on_delete` | Що станеться |
|---|---|
| `CASCADE` | видалити й книжки (рядки замовлення разом із замовленням) |
| `PROTECT` | заборонити видалення: `ProtectedError` |
| `SET_NULL` | обнулити посилання (потрібне `null=True`) |
| `RESTRICT` | як `PROTECT`, але дозволяє, якщо видаляються в тому самому каскаді |

Багато-до-багатьох — `tags = models.ManyToManyField(Tag, related_name="books")`: сполучну таблицю Django створить сам.

## Meta і обмеження

`Meta.ordering` — порядок за замовчуванням для всіх запитів. `constraints` — правила, які перевіряє **база**:

- `CheckConstraint(condition=Q(pages__gte=1), name=...)` — умова для кожного рядка;
- `UniqueConstraint(fields=["member", "book"], name=...)` — унікальна пара полів.

Ім'я обмеження має бути унікальним у всьому проєкті — його видно в міграціях і повідомленнях про помилки.

## Міграції

```bash
python manage.py makemigrations     # порівняти моделі з останньою міграцією → library/migrations/0002_….py
python manage.py migrate            # застосувати до бази всі ще не застосовані міграції
python manage.py showmigrations     # які застосовано: [X], які ні: [ ]
python manage.py sqlmigrate library 0002   # показати SQL міграції, нічого не виконуючи
```

Міграції — це **код**: їх комітять разом зі зміною моделі, читають перед комітом і ніколи не редагують після того, як вони застосовані десь, крім твого комп'ютера. Додаєш обов'язкове поле до таблиці з даними — дай йому `default` (або спершу `null=True`), інакше `makemigrations` спитає, що записати в наявні рядки.

Погратися з моделями можна в оболонці проєкту: `npm run lab:py-django -- shell`, далі `Book.objects.create(...)`, `Book.objects.all()`.

## Типові помилки

| Помилка | Наслідок |
|---|---|
| Змінив(ла) модель, але не `makemigrations` | база не відповідає коду: `no such column` |
| `makemigrations` без `migrate` | файл міграції є, таблиць немає |
| `FloatField` для грошей | `0.1 + 0.2 != 0.3` — копійки губляться |
| `null=True` на `CharField` без потреби | два «порожніх» значення: `NULL` і `""` |
| `on_delete=CASCADE` для довідника | видалив категорію — зникли всі товари |

> [!QA]
> Обмеження бази тестують напряму: створи рядок, що їх порушує, і чекай `IntegrityError`. У тесті з `django_db` огорни таку операцію в `transaction.atomic()`: `with pytest.raises(IntegrityError), transaction.atomic(): ...` — інакше зламана транзакція заблокує всі наступні запити цього тесту.

## Підсумок

- Модель — клас `models.Model`, поле — стовпець; `id` Django додає сам.
- `null` — про базу, `blank` — про форми; `unique`, `choices`, `default` — найчастіші параметри.
- `ForeignKey(..., on_delete=..., related_name=...)`: `CASCADE` для «частин», `PROTECT` для довідників.
- `Meta.ordering` і `Meta.constraints` (`CheckConstraint(condition=...)`, `UniqueConstraint`).
- Змінив(ла) модель → `makemigrations` → прочитав(ла) міграцію → `migrate` → комітиш модель разом з міграцією.
