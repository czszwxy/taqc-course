# Адмінка, користувачі й права

Дві «батарейки» Django, заради яких його часто й обирають: **адмінка** — готовий інтерфейс для співробітників без жодного рядка HTML — і **система користувачів** з паролями, входом, групами й правами.

## Адмінка

```bash
npm run lab:py-django -- createsuperuser
```

```python
# library/admin.py
from django.contrib import admin
from .models import Book

@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "pages", "status"]     # стовпці списку
    list_filter = ["status", "author"]                         # фільтри праворуч
    search_fields = ["title", "isbn"]                          # поле пошуку (?q=)
    prepopulated_fields = {"slug": ["title"]}                  # slug заповнюється з назви, поки ти друкуєш
    readonly_fields = ["added_at"]                             # видно, але не змінити
    ordering = ["title"]
    actions = ["mark_on_loan"]

    @admin.action(description="Mark selected books as on loan")
    def mark_on_loan(self, request, queryset):
        updated = queryset.update(status=Book.Status.ON_LOAN)
        self.message_user(request, f"{updated} books marked as on loan.")
```

Адмінка — інструмент **співробітників** (`is_staff = True`). Користувач без `is_staff`, відкривши `/admin/`, потрапить на сторінку входу адмінки. Покупцям і читачам робиш окремі сторінки.

## Користувачі

```python
from django.contrib.auth import get_user_model

User = get_user_model()
olha = User.objects.create_user("olha", email="olha@example.com", password="s3cret-pass")
olha.password                    # 'pbkdf2_sha256$…' — хеш, не пароль
olha.check_password("s3cret-pass")   # True
olha.is_staff, olha.is_superuser     # False, False
```

Пароль зберігається повільним солоним хешем (PBKDF2 за замовчуванням) — те, що в модулі про FastAPI ти робив(ла) вручну. Ніколи не записуй пароль прямо в поле: `user.password = "..."` збереже його відкритим текстом; для зміни є `user.set_password(...)`.

> [!TIP]
> У новому проєкті одразу заведи власну модель користувача (`class User(AbstractUser)` і `AUTH_USER_MODEL = "accounts.User"` у налаштуваннях) — навіть порожню. Змінити модель користувача, коли в базі вже є дані, дуже складно, а додати поле у власну — звичайна міграція.

Вхід і вихід дають готові views: `path("accounts/", include("django.contrib.auth.urls"))` — це `login`, `logout`, скидання пароля (шаблони сторінок пишеш сам(а)).

## Лише для тих, хто увійшов

```python
from django.contrib.auth.decorators import login_required, permission_required
from django.contrib.auth.mixins import LoginRequiredMixin

@login_required
def my_loans(request):
    loans = Loan.objects.filter(member=request.user)       # лише СВОЇ позики
    ...

class MyLoansView(LoginRequiredMixin, ListView): ...
```

Гість отримає `302` на `settings.LOGIN_URL` (за замовчуванням `/accounts/login/`) з `?next=/loans/mine/` — після входу Django поверне його назад.

**Чужі дані.** Найчастіша вразливість — `Loan.objects.get(pk=pk)` без перевірки власника: читач змінює число в адресі й бачить чужу позику (IDOR). Фільтруй за власником: `get_object_or_404(Loan, pk=pk, member=request.user)`. Чужий об'єкт тоді дає `404`, і користувач навіть не дізнається, що він існує.

## Права і групи

Для кожної моделі Django створює чотири права: `add_book`, `change_book`, `delete_book`, `view_book` (повна назва — `library.change_book`). Права дають користувачам напряму або через **групи** («Бібліотекарі»):

```python
user.has_perm("library.change_book")

@login_required
@permission_required("library.view_loan", raise_exception=True)
def overdue_report(request): ...
```

| Ситуація | Відповідь |
|---|---|
| гість, `@login_required` | `302` на вхід |
| увійшов, немає права, `permission_required(..., raise_exception=True)` | `403` |
| `permission_required` **без** `raise_exception` | `302` на вхід навіть тому, хто вже увійшов, — збиває з пантелику |
| гість, лише `permission_required(..., raise_exception=True)` | `403` (не `302`!) — тому зверху ставлять `login_required` |
| `is_superuser` | має всі права |

## Тести з користувачами

```python
def test_my_loans_needs_login(client):
    response = client.get("/loans/mine/")
    assert response.status_code == 302
    assert response["Location"] == "/accounts/login/?next=/loans/mine/"

def test_member_sees_own_loans(client, django_user_model):
    olha = django_user_model.objects.create_user("olha", password="pw-123456")
    client.force_login(olha)                     # увійти без форми й пароля
    assert client.get("/loans/mine/").status_code == 200
```

`django_user_model` — модель користувача проєкту, `admin_client` — клієнт, уже залогінений суперкористувачем. Права: `user.user_permissions.add(Permission.objects.get(codename="view_loan"))`.

## Типові помилки

| Помилка | Наслідок |
|---|---|
| `get(pk=pk)` без фільтра за власником | читач бачить чужі дані, змінюючи id в адресі |
| `403` для чужого об'єкта | підтверджує, що об'єкт існує; частіше відповідають `404` |
| `user.password = "..."` | пароль у базі відкритим текстом; є `set_password` |
| Адмінка як кабінет клієнта | клієнтам не дають `is_staff` |
| Лише `permission_required(raise_exception=True)` | гість отримує `403` замість сторінки входу |

> [!QA]
> Матриця доступу — обов'язкові тести для кожного закритого view: гість, звичайний користувач, власник, чужий, з правом, без права, співробітник. У кожної клітинки — свій очікуваний код (`200`, `302`, `403`, `404`).

## Підсумок

- `@admin.register` + `ModelAdmin`: `list_display`, `list_filter`, `search_fields`, `prepopulated_fields`, `readonly_fields`, дії.
- Користувачі: `create_user` хешує пароль; `is_staff` — доступ до адмінки.
- `login_required` / `LoginRequiredMixin` → гість отримує `302` на вхід з `?next=`.
- Права `app.add/change/delete/view_model`, групи; `permission_required(..., raise_exception=True)` → `403`, разом з `login_required` зверху.
- Чужі об'єкти фільтруй за власником → `404`.
