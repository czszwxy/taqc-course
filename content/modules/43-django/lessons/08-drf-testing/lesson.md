# Django REST Framework і тести Django

JSON-API з уроку 4 вимагав купу ручної роботи: розбір JSON, перевірка кожного поля, коди помилок. **Django REST Framework** (DRF) — найпопулярніше доповнення до Django — робить це так само декларативно, як форми: серіалізатор описує дані й перевірки, generic view — типові операції, дозволи — хто що може.

## Серіалізатор

Приклад — позики бібліотеки:

```python
from rest_framework import serializers
from .models import Loan

class LoanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Loan
        fields = ["id", "book", "member", "due_date", "returned_at"]
        read_only_fields = ["id", "returned_at"]

    def validate_due_date(self, value):
        if value < date.today():
            raise serializers.ValidationError("Due date cannot be in the past.")
        return value

    def validate(self, attrs):
        if attrs["book"].status == Book.Status.ON_LOAN:
            raise serializers.ValidationError({"book": "This book is already on loan."})
        return attrs
```

Серіалізатор працює в обидва боки: **об'єкт → JSON** (`LoanSerializer(loan).data`) і **JSON → перевірені дані → об'єкт** (`serializer.is_valid()`, `serializer.save()`). Перевірки — як у формах: поле (тип, межі, валідатори поля) → `validate_<поле>` → `validate`. Помилки — словник «поле → список повідомлень».

ModelSerializer сам додає перевірку унікальності з моделі, але як **валідатор поля** — тобто **до** твого `validate_<поле>`. Якщо ти нормалізуєш значення (переводиш у верхній регістр), дубль після нормалізації перевір у `validate_<поле>` сам(а), а при оновленні виключи поточний об'єкт: `.exclude(pk=self.instance.pk)`. У формах Django навпаки — унікальність перевіряється після `clean`-методів.

## Generic views

```python
from rest_framework import generics, permissions

class LoanListCreateView(generics.ListCreateAPIView):          # GET — список, POST — створити
    queryset = Loan.objects.select_related("book", "member")
    serializer_class = LoanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return super().get_queryset().filter(member=self.request.user)

class LoanDetailView(generics.RetrieveUpdateDestroyAPIView):   # GET, PUT, PATCH, DELETE одного
    queryset = Loan.objects.all()
    serializer_class = LoanSerializer
```

| Ситуація | Код DRF |
|---|---|
| створено | `201` |
| невалідні дані | **`400`** з `{"поле": ["повідомлення"]}` (FastAPI тут відповідав `422`) |
| не знайдено | `404` |
| видалено | `204` |
| немає облікових даних, автентифікація через сесію | **`403`** (у сесії немає заголовка `WWW-Authenticate`, тож DRF не може відповісти `401`) |
| немає облікових даних, токени (`TokenAuthentication`) | `401` |
| немає прав | `403` |

Для типового CRUD є ще коротший шлях — **ViewSet** і **router**: `class LoanViewSet(viewsets.ModelViewSet)` і `router.register("loans", LoanViewSet)` створюють усі п'ять маршрутів одразу. А якщо відкрити адресу API в браузері, DRF покаже зручну сторінку з формами — browsable API.

## Дозволи

```python
from rest_framework.permissions import SAFE_METHODS, BasePermission

class IsLibrarianOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or request.user.is_staff     # GET, HEAD, OPTIONS — усім
```

Вбудовані: `AllowAny`, `IsAuthenticated`, `IsAuthenticatedOrReadOnly`, `IsAdminUser` (це `is_staff`). Для перевірки конкретного об'єкта («лише автор відгуку») є `has_object_permission`.

## Тести Django з pytest-django

```python
import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db          # усі тести файлу можуть працювати з базою

@pytest.fixture
def member(django_user_model):
    return django_user_model.objects.create_user("olha", password="pw-123456")

@pytest.fixture
def make_book():                            # фікстура-фабрика: свій об'єкт для кожного тесту
    def make(**fields):
        return Book.objects.create(**{"title": "Kobzar", "pages": 300, **fields})
    return make

def test_member_borrows_a_book(member, make_book):
    api = APIClient()
    api.force_authenticate(member)          # увійти без пароля
    response = api.post("/api/loans/", {"book": make_book().pk, "due_date": "2030-01-01"}, format="json")
    assert response.status_code == 201
    assert Loan.objects.get().member == member
```

| Інструмент | Для чого |
|---|---|
| `@pytest.mark.django_db` / `pytestmark` | дозволити тесту базу; кожен тест — у транзакції, що відкочується |
| `client`, `admin_client` | тестовий клієнт Django: гість / суперкористувач |
| `APIClient` + `force_authenticate` | запити до DRF з JSON (`format="json"`) |
| `django_user_model` | модель користувача проєкту |
| `django_assert_num_queries(n)` | рівно `n` SQL-запитів |
| `settings` | змінити налаштування для одного тесту |

Що варто тестувати в кожного ендпоінта: «щасливий шлях» з повним тілом відповіді, кожну помилку перевірки, межі значень, **матрицю доступу** (гість, користувач, власник, співробітник) і стан бази після запиту — що створено, що не змінилося після помилки.

> [!TIP]
> Справжній хешер паролів навмисно повільний, тож тести з багатьма `create_user` тягнуться десятки секунд. У **тестових** налаштуваннях ставлять швидкий: `PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]` — так зроблено в `settings.py` задач курсу. У продакшні — ніколи.

## Типові помилки

| Помилка | Наслідок |
|---|---|
| `fields = "__all__"` у серіалізаторі | API віддає й приймає службові поля |
| Лише `IsAuthenticated` на детальній view | будь-хто, хто увійшов, змінює чужі об'єкти |
| Тест без `django_db` | `RuntimeError: Database access not allowed` |
| Тести залежать від порядку (спільні дані) | падають «випадково»; дані — з фікстур у кожному тесті |
| Перевіряєш лише `status_code` | витік поля чи неправильне значення непомітні |

> [!QA]
> Тест цінний, коли він **ловить** зламаний код. Перевір себе: тимчасово прибери перевірку з view — хоча б один тест має почервоніти. У задачі цього уроку курс зробить це за тебе: твої тести запустять на семи зламаних версіях API.

## Підсумок

- Серіалізатор DRF — як форма для JSON: поля, `validate_<поле>`, `validate`, унікальність з моделі.
- Generic views (`ListCreateAPIView`, `RetrieveUpdateDestroyAPIView`) і ViewSet + router — CRUD майже без коду.
- Дозволи: вбудовані й власні через `BasePermission` (`SAFE_METHODS`).
- DRF: валідація — `400`; без облікових даних із сесіями — `403`, з токенами — `401`.
- pytest-django: `django_db`, `client` / `APIClient`, `force_login` / `force_authenticate`, фікстури-фабрики, `django_assert_num_queries`.
