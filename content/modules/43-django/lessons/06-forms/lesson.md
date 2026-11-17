# Форми і валідація

У JSON-API з уроку 4 ти перевіряв(ла) кожне поле вручну: тип, межі, порожні рядки, дублікати. **Форми** Django роблять це декларативно — і ще вміють показати себе в HTML разом з помилками. Ті самі форми перевіряють дані адмінки, а серіалізатори DRF (урок 8) побудовані на схожій ідеї.

## ModelForm

Приклад — читач бібліотеки:

```python
from django import forms
from .models import Member

class MemberForm(forms.ModelForm):
    class Meta:
        model = Member
        fields = ["full_name", "email", "card_number", "birth_year"]

    def clean_card_number(self):
        number = self.cleaned_data["card_number"].strip().upper()
        if not number.startswith("LIB-"):
            raise forms.ValidationError("Card numbers start with LIB-.")
        return number

    def clean(self):
        cleaned = super().clean()
        if cleaned.get("birth_year") and cleaned["birth_year"] > 2020 and not cleaned.get("email"):
            self.add_error("email", "Children need a parent's email.")
        return cleaned
```

`ModelForm` бере поля, типи й обмеження з моделі: `max_length`, `unique`, `choices`, `blank`. `fields` — **білий список**: лише ці поля можна заповнити з форми.

> [!WARNING]
> Ніколи не пиши `fields = "__all__"` у формах для користувачів. Додасть хтось у модель `is_vip` чи `discount` — і будь-хто зможе виставити його собі, дописавши поле в запит (mass assignment).

## Як форма перевіряє дані

```python
form = MemberForm(data={"full_name": "Olha", "card_number": " lib-0042 ", "birth_year": "1990"})
form.is_valid()          # True / False — запускає всі перевірки
form.cleaned_data        # {'full_name': 'Olha', 'card_number': 'LIB-0042', 'birth_year': 1990, ...}
form.errors              # {'email': ['Enter a valid email address.']} — поле → список повідомлень
member = form.save()     # ModelForm створює (або оновлює) об'єкт
```

Порядок перевірок:

1. **Поле** перетворює рядок на значення й перевіряє тип і межі (`"1990"` → `1990`; `"abc"` → «Enter a whole number.»).
2. **`clean_<поле>()`** — твоя перевірка одного поля; повертає очищене значення (тут — `strip().upper()`).
3. **`clean()`** — перевірки, що залежать від кількох полів; помилку прив'язують до поля через `add_error`.
4. **ModelForm** перевіряє модель, зокрема **унікальність** — уже на очищених значеннях: `" lib-0042 "` і `"LIB-0042"` будуть дублями.

`ValidationError` у `clean_<поле>` стає помилкою цього поля, у `clean()` без `add_error` — загальною помилкою форми (`form.non_field_errors()`).

## Форма у view: Post/Redirect/Get

```python
from django.contrib import messages
from django.shortcuts import get_object_or_404, redirect, render

def member_create(request):
    if request.method == "POST":
        form = MemberForm(request.POST)
        if form.is_valid():
            member = form.save()
            messages.success(request, f"Member {member.full_name} added.")
            return redirect("member-detail", pk=member.pk)       # 302 → GET
    else:
        form = MemberForm()
    return render(request, "library/member_form.html", {"form": form})

def member_edit(request, pk):
    member = get_object_or_404(Member, pk=pk)
    form = MemberForm(request.POST or None, instance=member)     # instance → редагування
    if request.method == "POST" and form.is_valid():
        form.save()
        return redirect("member-detail", pk=member.pk)
    return render(request, "library/member_form.html", {"form": form})
```

- **GET** — порожня (або заповнена з `instance`) форма.
- **POST з помилками** — та сама сторінка з помилками й уже введеними значеннями.
- **POST успішний** — зберегти і **перенаправити**. Це шаблон **PRG**: якщо після збереження просто показати сторінку, оновлення сторінки (F5) надішле форму ще раз і створить дубль.
- `messages.success(...)` переживає перенаправлення й показується на наступній сторінці.

```django
<form method="post">
  {% csrf_token %}
  {{ form.as_p }}            {# поля з підписами й помилками #}
  <button type="submit">Save</button>
</form>
{% for message in messages %}<p class="message">{{ message }}</p>{% endfor %}
```

`{% csrf_token %}` обов'язковий у кожній POST-формі — без нього справжній браузер отримає `403`.

## Типові помилки

| Помилка | Наслідок |
|---|---|
| `fields = "__all__"` | користувач заповнює поля, які не повинен |
| `clean_<поле>` нічого не повертає | значення поля стає `None` |
| `render` після успішного POST | F5 створює дубль; потрібен `redirect` |
| Читати `request.POST["price"]` повз форму | ні перевірок, ні перетворення типів |
| Форма без `{% csrf_token %}` | `403` у браузері (тести без `enforce_csrf_checks` цього не помітять) |

> [!QA]
> Форми зручно тестувати **без** браузера і навіть без view: `ProductForm(data={...}).is_valid()` і `form.errors`. Межі, порожні значення, пробіли, регістр, дублікати — кожен випадок одним рядком. А view тестують на три гілки PRG: GET — 200, невалідний POST — 200 з помилками й без запису в базі, валідний — 302 і новий рядок.

## Підсумок

- `ModelForm` бере поля з моделі; `fields` — завжди явний список.
- `is_valid()` запускає: поле → `clean_<поле>` → `clean()` → перевірки моделі (унікальність).
- `cleaned_data` — очищені значення, `errors` — поле → повідомлення; `add_error` прив'язує помилку `clean()` до поля.
- View: GET — форма, POST невалідний — форма з помилками, POST валідний — `save()` + `redirect` (PRG) + `messages`.
- `instance=` — редагування наявного об'єкта; `{% csrf_token %}` — у кожній POST-формі.
