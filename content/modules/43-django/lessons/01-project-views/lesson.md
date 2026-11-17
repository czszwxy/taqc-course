# Проєкт, маршрути і views

FastAPI дає маршрутизацію й перевірку даних, а решту ти збираєш сам(а): ORM, міграції, автентифікацію. **Django** — фреймворк «з батарейками»: ORM, міграції, адмінка, користувачі, шаблони, форми й захист від типових атак уже в комплекті. На ньому написані великі сайти й внутрішні системи, і для Python-розробника це одна з найчастіших вимог у вакансіях.

## Проєкт і застосунки

```bash
django-admin startproject config .     # проєкт: налаштування й головні маршрути
python manage.py startapp library      # застосунок: одна тема (книжки, замовлення, користувачі)
```

```text
.
├── manage.py            # «пульт керування» проєктом
├── config/
│   ├── settings.py      # налаштування: застосунки, база, шаблони, ключі
│   ├── urls.py          # головні маршрути
│   └── wsgi.py / asgi.py
└── library/             # застосунок
    ├── models.py        # таблиці
    ├── views.py         # обробники запитів
    ├── urls.py          # маршрути застосунку (створюєш сам(а))
    ├── admin.py         # адмінка
    ├── migrations/      # історія змін схеми
    └── templates/library/
```

**Проєкт** — це весь сайт. **Застосунок** (app) — модуль однієї теми, який можна перенести в інший проєкт. Новий застосунок треба додати в `INSTALLED_APPS` у `settings.py` — інакше Django не побачить його моделей і шаблонів.

## Практичний проєкт курсу

У курсі вже є готовий проєкт `lab/python/django_site` з застосунком `library`. Команди `manage.py` запускай через npm (віртуальне середовище активувати не треба):

```bash
npm run lab:py-django -- migrate            # створити таблиці в db.sqlite3
npm run lab:py-django -- createsuperuser    # користувач для адмінки
npm run lab:py-django -- runserver          # сервер на http://127.0.0.1:8000
```

Відкрий `http://127.0.0.1:8000/admin/`, додай кілька книжок, потім подивись `http://127.0.0.1:8000/books/`. Сервер перезапускається сам, коли ти зберігаєш файли. `Ctrl+C` — зупинити.

## Шлях запиту

```text
GET /books/7/  →  middleware  →  config/urls.py  →  library/urls.py  →  views.book_detail(request, pk=7)  →  HttpResponse
```

```python
# config/urls.py
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("books/", include("library.urls")),    # усе, що починається з books/, — у застосунок
]
```

```python
# library/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("", views.book_list, name="book-list"),                 # /books/
    path("<int:pk>/", views.book_detail, name="book-detail"),    # /books/7/
    path("authors/<slug:slug>/", views.author_books, name="author-books"),
]
```

**Конвертери** у кутових дужках перетворюють частину шляху й передають її у view як іменований аргумент:

| Конвертер | Приймає | Приклад |
|---|---|---|
| `<int:pk>` | ціле ≥ 0 | `/books/7/` → `pk=7` (`int`) |
| `<str:code>` | будь-що без `/` (за замовчуванням) | `/loans/A-12/` → `code="A-12"` |
| `<slug:slug>` | латиниця, цифри, `-`, `_` | `/authors/lesya-ukrainka/` |
| `<uuid:token>` | UUID | `/invites/1f0e…/` |

Шлях, що не підходить під жоден маршрут (`/books/abc/` для `<int:pk>`), дає `404` — view навіть не викликається.

## View: запит → відповідь

```python
from django.http import JsonResponse
from django.views.decorators.http import require_GET

@require_GET
def author_books(request, slug):
    year = request.GET.get("year")                         # ?year=1911 → "1911" (рядок!) або None
    found = [b for b in BOOKS if b["author_slug"] == slug]
    if year is not None:
        found = [b for b in found if str(b["year"]) == year]
    return JsonResponse(found, safe=False)
```

- View — функція, що отримує `request` (+ аргументи з шляху) і **повертає** `HttpResponse`.
- `request.GET` — параметри рядка запиту, `request.method` — метод. Значення завжди рядки.
- `JsonResponse(dict)` — JSON-відповідь. Для списку потрібен `safe=False`, інакше `TypeError`.
- `JsonResponse(..., status=404)` — свій код статусу.
- `@require_GET` / `@require_POST` / `@require_http_methods(["GET", "POST"])` — інші методи отримають `405`.

## Імена маршрутів і reverse()

```python
from django.urls import reverse

reverse("book-detail", args=[7])                 # "/books/7/"
reverse("author-books", kwargs={"slug": "lesya-ukrainka"})
```

Адресу в коді й шаблонах **не пишуть вручну** — її будують за іменем маршруту. Змінив(ла) шлях у `urls.py` — усі посилання оновились самі.

> [!NOTE]
> `CommonMiddleware` з налаштуванням `APPEND_SLASH = True` (за замовчуванням) перенаправляє `GET /books` на `/books/` кодом `301`, якщо маршрут зі слешем існує. Тому в Django шляхи зазвичай закінчуються на `/`.

## Як влаштовані задачі модуля

Кожна задача — маленький проєкт: `settings.py`, застосунок `shop/` з кількома файлами. Ти редагуєш **один** файл (його назва — над редактором, наприклад `shop/views.py`), інші показані під умовою лише для читання. Перевірка — прихований `tests.py` з **pytest-django**: фікстура `client` надсилає запити у твій проєкт, а база — свіжа SQLite у пам'яті. Задачі запускаються на твоєму комп'ютері (потрібен один раз `npm run lab:python-setup`).

## Типові помилки

| Помилка | Наслідок |
|---|---|
| Застосунок не додано в `INSTALLED_APPS` | моделі й шаблони «не знаходяться» |
| View повертає `dict` замість `JsonResponse` | `500`: view має повернути `HttpResponse` |
| `JsonResponse([...])` без `safe=False` | `TypeError` |
| `request.GET["year"]` без перевірки | `MultiValueDictKeyError` → `500`, якщо параметра немає; бери `.get()` |
| Адреси вписані рядками: `"/books/" + str(pk)` | ламаються після зміни `urls.py`; бери `reverse()` |

> [!QA]
> Маршрути — перше, що варто перевірити тестом: кожне ім'я `reverse()`-иться в очікуваний шлях, невалідні частини шляху дають `404`, «чужі» методи — `405`. Такі тести ловлять зламані посилання раніше, ніж користувачі.

## Підсумок

- Django = проєкт (налаштування, головні маршрути) + застосунки (теми); застосунок — в `INSTALLED_APPS`.
- `manage.py` керує проєктом; у курсі — `npm run lab:py-django -- <команда>`.
- `path("books/<int:pk>/", view, name="book-detail")`: конвертер перетворює і перевіряє частину шляху.
- View отримує `request` і повертає `HttpResponse` / `JsonResponse`; `require_GET` / `require_POST` обмежують методи.
- Адреси будуй через `reverse()` за іменем маршруту.
