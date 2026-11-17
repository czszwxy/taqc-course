# Шаблони і наслідування

Django вміє віддавати не лише JSON, а й готові HTML-сторінки: view передає дані в **шаблон**, і той перетворюється на HTML. На цьому побудовані адмінки, внутрішні інструменти, багато інтернет-магазинів і сторінки входу навіть у проєктах з окремим фронтендом.

## Мова шаблонів

```django
<h1>{{ book.title }}</h1>
<p>{{ book.author.name }} · {{ book.pages }} pages · added {{ book.added_at|date:"d.m.Y" }}</p>
<p>{{ book.summary|default:"No summary yet."|truncatechars:120 }}</p>

{% if book.status == "on_loan" %}
  <span class="badge">On loan</span>
{% elif book.copies > 3 %}
  <span class="badge">Plenty</span>
{% endif %}

<ul>
  {% for review in reviews %}
    <li>{{ forloop.counter }}. {{ review.text }}</li>
  {% empty %}
    <li>No reviews yet.</li>
  {% endfor %}
</ul>
<p>{{ reviews|length }} review{{ reviews|pluralize }}</p>
<a href="{% url 'book-detail' book.pk %}">Open</a>
{# коментар, у HTML не потрапить #}
```

| Що | Як працює |
|---|---|
| `{{ змінна }}` | вивести значення; крапка — атрибут, ключ словника або метод без аргументів (`{{ book.get_status_display }}`) |
| `{{ x|filter:"arg" }}` | фільтр змінює значення: `default`, `length`, `date`, `lower`, `truncatechars`, `pluralize`… |
| `{% tag %}` | логіка: `if`, `for` / `empty`, `url`, `now`, `include`, `csrf_token` |
| `forloop.counter` | номер ітерації від 1 (`forloop.first`, `forloop.last` — теж є) |

Немає змінної — шаблон не падає, а виводить порожнечу. Зручно, але друкарська помилка в імені змінної мовчки дає порожнє місце — тому шаблони теж тестують.

## Де лежать шаблони

Із `APP_DIRS: True` Django шукає шаблони в `<app>/templates/`. Прийнято класти їх у **підпапку з назвою застосунку**: `library/templates/library/book_list.html`, а у view писати `"library/book_list.html"` — інакше однакові назви з різних застосунків заважатимуть одна одній.

## Наслідування

Спільний каркас — у базовому шаблоні:

```django
{# library/templates/library/base.html #}
<!doctype html>
<html lang="en">
<head><title>{% block title %}Library{% endblock %}</title></head>
<body>
  <nav>
    <a href="{% url 'book-list' %}">Books</a>
    {% if user.is_authenticated %}Hi, {{ user.username }}{% else %}<a href="{% url 'login' %}">Log in</a>{% endif %}
  </nav>
  <main>{% block content %}{% endblock %}</main>
  <footer>&copy; {% now "Y" %} City library</footer>
</body>
</html>
```

```django
{# library/templates/library/book_list.html #}
{% extends "library/base.html" %}

{% block title %}Books · {{ block.super }}{% endblock %}

{% block content %}
  <h1>Books</h1>
  {% include "library/_book_card.html" with book=featured %}
{% endblock %}
```

- `{% extends %}` — **перший** тег дочірнього шаблону.
- Дочірній шаблон перевизначає блоки; `{{ block.super }}` вставляє вміст батьківського блоку.
- Усе поза блоками в дочірньому шаблоні ігнорується.
- `user` і `request` доступні в кожному шаблоні завдяки **контекстним процесорам** у `settings.py`.

## Автоекранування і XSS

Користувач написав у відгуку `<script>steal()</script>`. Django **екранує** кожну змінну: у HTML потрапить `&lt;script&gt;…`, і браузер покаже текст, а не виконає код. Це захист від **XSS** (cross-site scripting) — однієї з найпоширеніших атак.

Вимкнути захист можна — і саме тут народжуються вразливості:

| Код | Безпечно? |
|---|---|
| `{{ review.text }}` | так — екранується |
| `{{ review.text|safe }}` | **ні**, якщо там дані користувача |
| `{% autoescape off %}…{% endautoescape %}` | **ні** для даних користувача |
| `mark_safe(user_input)` у Python | **ні** |
| `format_html("<b>{}</b>", name)` у Python | так — підставлені значення екрануються |
| `HttpResponse(f"<h1>{name}</h1>")` | **ні** — f-рядок нічого не екранує |
| `<a href="{{ profile.website }}">` | **ні**: лапки екрануються, але `javascript:alert(1)` — валідна адреса; перевіряй схему URL |

> [!WARNING]
> `|safe` і `mark_safe` — це обіцянка «я перевірив(ла), тут немає чужого HTML». Ставлять їх лише на HTML, який згенерував твій код, ніколи — на текст від користувача.

## Тести шаблонів

pytest-django має модуль `pytest_django.asserts` з перевірками Django:

```python
from pytest_django.asserts import assertContains, assertNotContains, assertTemplateUsed

response = client.get("/books/")
assertTemplateUsed(response, "library/base.html")               # наслідування спрацювало
assertContains(response, "<h1>Books</h1>", html=True)            # порівняння як HTML, а не як рядків
assertNotContains(response, "<script>steal()</script>")          # дані користувача екрановані
response.context["books"]                                        # що view передала в шаблон
```

`html=True` порівнює структуру HTML: зайві пробіли, переноси й порядок атрибутів не заважають.

## Типові помилки

| Помилка | Наслідок |
|---|---|
| `{% extends %}` не першим тегом | `TemplateSyntaxError` |
| Шаблон не в `<app>/templates/<app>/` | `TemplateDoesNotExist` або чужий шаблон з тією самою назвою |
| Адреса рядком: `href="/books/{{ book.pk }}/"` | ламається після зміни маршрутів; бери `{% url %}` |
| Друкарська помилка в змінній | порожнє місце без помилки — ловиться лише тестом |
| `|safe` на тексті користувача | XSS |

> [!QA]
> XSS-перевірка для кожної сторінки з даними користувача: створи об'єкт з `<script>` або `"><img src=x onerror=alert(1)>` у назві й переконайся, що у відповіді є `&lt;script&gt;`, а самого тегу немає.

## Підсумок

- `{{ змінна|фільтр }}` і `{% тег %}`; `for` / `empty`, `if`, `url`, `now`, `include`.
- Шаблони — у `<app>/templates/<app>/`; `user` і `request` доступні всюди.
- `{% extends "base.html" %}` + `{% block %}`; `{{ block.super }}` — вміст батьківського блоку.
- Автоекранування захищає від XSS; `|safe`, `mark_safe`, `autoescape off` — лише для власного HTML.
- Тести: `assertTemplateUsed`, `assertContains(..., html=True)`, `response.context`.
