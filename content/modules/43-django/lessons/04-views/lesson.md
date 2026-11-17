# Функціональні й класові views

View вирішує, що відповісти на запит: прочитати параметри, звернутися до моделей, повернути сторінку, JSON чи перенаправлення. Django дає два стилі: **функції** — коли логіка своя, і **класи-заготовки** (generic views) — коли сторінка типова: «список з пагінацією», «один об'єкт».

## request і відповіді

| Атрибут | Що там |
|---|---|
| `request.method` | `"GET"`, `"POST"`… |
| `request.GET` | параметри рядка запиту (`?page=2`), значення — рядки |
| `request.POST` | поля HTML-форми |
| `request.body` | сире тіло (байти) — для JSON: `json.loads(request.body)` |
| `request.headers["Accept"]` | заголовки |
| `request.user` | поточний користувач (урок 7) |

| Відповідь | Коли |
|---|---|
| `render(request, "library/book_list.html", context)` | HTML-сторінка з шаблону |
| `JsonResponse(data, status=201)` | JSON |
| `redirect("book-detail", pk=book.pk)` | перенаправлення `302` (за ім'ям маршруту) |
| `raise Http404("...")` / `get_object_or_404(Book, pk=pk)` | сторінка `404` |
| `HttpResponse(status=204)` | без тіла |

```python
from django.shortcuts import get_object_or_404, redirect, render

def book_detail(request, pk):
    book = get_object_or_404(Book, pk=pk, status=Book.Status.AVAILABLE)
    return render(request, "library/book_detail.html", {"book": book})
```

`get_object_or_404` — це `get()`, який замість `DoesNotExist` піднімає `Http404`; Django перетворить його на сторінку «Not Found». Для JSON-API, де клієнт чекає JSON навіть у помилці, відповідай сам(а): `JsonResponse({"error": "..."}, status=404)`.

## JSON-API власноруч

```python
import json
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

@csrf_exempt
@require_http_methods(["GET", "POST"])
def loans(request):
    if request.method == "GET":
        return JsonResponse([loan_to_dict(l) for l in Loan.objects.filter(returned_at__isnull=True)], safe=False)
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    errors = {}
    if not isinstance(data.get("book_id"), int):
        errors["book_id"] = "Must be a number"
    if errors:
        return JsonResponse({"errors": errors}, status=400)
    ...
    response = JsonResponse(loan_to_dict(loan), status=201)
    response["Location"] = reverse("loan-detail", args=[loan.pk])
    return response
```

- Django за замовчуванням вимагає **CSRF-токен** для кожного `POST` — так він захищає HTML-форми від підробки запитів з чужих сайтів. JSON-API для інших сервісів чи мобільних застосунків не має форми з токеном, тому такі views позначають `@csrf_exempt` і захищають інакше (токени — урок 8).
- Тестовий `client` CSRF не перевіряє (хіба що `Client(enforce_csrf_checks=True)`), тож тест не помітить забутий токен у формі — пам'ятай про це.
- Django відповідає `400` з HTML, а не з JSON, якщо ти сам(а) не повернеш JSON-помилку.
- Ручна перевірка тіла швидко розростається. Її роблять **форми** (урок 6) і **серіалізатори DRF** (урок 8) — тут ти побачиш, навіщо вони.

## Класові views

```python
from django.views import View

class HealthView(View):
    def get(self, request):
        return JsonResponse({"status": "ok"})
```

У маршрутах класу потрібен `.as_view()`: `path("health/", HealthView.as_view())`. Методи називаються як HTTP-методи; на «чужий» метод Django сам відповість `405`.

### ListView і DetailView

```python
from django.views.generic import DetailView, ListView

class AuthorBookListView(ListView):
    template_name = "library/book_list.html"     # за замовчуванням: library/book_list.html
    context_object_name = "books"                # у шаблоні — books (а ще завжди object_list)
    paginate_by = 10

    def get_queryset(self):
        books = Book.objects.select_related("author").order_by("title")
        author = self.request.GET.get("author")
        return books.filter(author__slug=author) if author else books

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["authors"] = Author.objects.all()
        return context

class BookDetailView(DetailView):
    model = Book                                 # шукає за pk або slug з маршруту
    queryset = Book.objects.filter(status=Book.Status.AVAILABLE)   # інші → 404
```

- `get_queryset()` — що показувати (фільтри з `self.request`, `self.kwargs`).
- `paginate_by` додає в контекст `page_obj`, `paginator`, `is_paginated`; сторінку бере з `?page=`. Неіснуюча сторінка — `404`.
- `DetailView` шукає об'єкт за `<int:pk>` або `<slug:slug>` з маршруту серед `queryset` / `get_queryset()`; не знайшов — `404`.
- `get_context_data()` — додати щось своє в шаблон; не забудь `super()`.

## Функція чи клас?

| Функція | Клас |
|---|---|
| нестандартна логіка, кілька гілок | типова сторінка: список, деталі, форма |
| усе видно в одному місці | менше коду, але треба знати, які методи перевизначати |

Обидва стилі рівноправні — у великих проєктах є і ті, й інші.

## Типові помилки

| Помилка | Наслідок |
|---|---|
| `path("books/", BookListView)` без `.as_view()` | `TypeError` під час запиту |
| `get()` замість `get_object_or_404` у view | `500` замість `404` |
| `request.GET["page"]` без перевірки | `500`, якщо параметра немає |
| `get_context_data` без `super()` | зникають `object_list` і `page_obj` |
| `int(request.GET["max_price"])` без `try` | `500` на `?max_price=abc` замість `400` |

> [!QA]
> Для кожного view перевіряй «щасливий шлях», порожній результат, неіснуючий об'єкт (`404`), невалідні параметри (`400`, а не `500`), чужий метод (`405`), сторінку пагінації за межами (`404`). У Django-тестах `response.context["page_obj"]` і `response.context["books"]` показують, що саме view передала в шаблон.

## Підсумок

- View читає `request` (`method`, `GET`, `POST`, `body`, `user`) і повертає відповідь: `render`, `JsonResponse`, `redirect`, `Http404`.
- `get_object_or_404` — об'єкт або `404`; для JSON-API помилки повертай JSON сам(а).
- CSRF захищає форми; JSON-API для сервісів — `@csrf_exempt` + інший захист.
- `ListView` / `DetailView`: `get_queryset`, `paginate_by` (`page_obj`), `context_object_name`, `get_context_data`; у маршрутах — `.as_view()`.
