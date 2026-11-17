# FastAPI і база даних

Дані в словнику зникають при кожному перезапуску сервера. Справжній API зберігає їх у базі. Ти вже вмієш працювати з SQLAlchemy (модуль «Databases & SQLAlchemy») — тепер поєднаємо її з FastAPI: кожен запит отримує свою сесію, ендпоінти читають і змінюють таблиці, а тести працюють на чистій базі в пам'яті.

## Дві моделі — дві ролі

| | Модель SQLAlchemy | Схема Pydantic |
|---|---|---|
| Описує | таблицю в базі | JSON на вході й виході API |
| Приклад | `class Booking(Base)` | `class BookingIn(BaseModel)`, `BookingOut` |
| Знає про | стовпці, ключі, зв'язки, індекси | межі значень, обов'язкові поля, що показати клієнту |
| Хто читає | база й ORM | FastAPI, Swagger UI, клієнт |

Їх **не змішують**: у таблиці є `password_hash` і службові стовпці, яких не повинно бути в API; а в схемі можуть бути поля, яких немає в таблиці (`password` при реєстрації).

```python
# models.py — таблиця
class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int]
    email: Mapped[str] = mapped_column(String(120))
    seats: Mapped[int]
```

```python
# схеми API
class BookingIn(BaseModel):
    event_id: int
    email: EmailStr
    seats: int = Field(ge=1, le=6)

class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: int
    seats: int
```

Ендпоінт може просто повернути ORM-об'єкт: FastAPI, перевіряючи відповідь моделлю, читає поля з **атрибутів** (`booking.id`) і бере лише потрібні. А щоб перетворити об'єкт на схему самому — `BookingOut.model_validate(booking)` у сервісі чи тесті, — схемі потрібен `from_attributes=True`: без нього Pydantic чекає словник і піднімає `ValidationError`. Тому його зазвичай ставлять у всі схеми відповіді.

## Сесія на кожен запит

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

engine = create_engine("sqlite:///./events.db")

def get_session():
    with Session(engine) as session:
        yield session

SessionDep = Annotated[Session, Depends(get_session)]
```

Це `yield`-залежність з минулого уроку: сесія відкривається для запиту й **закривається після нього** (`with`), навіть якщо ендпоінт упав. Закриття відкочує все, що не було `commit()`. Одна глобальна сесія на весь сервер — погана ідея: запити виконуються паралельно в різних потоках і заважали б один одному.

## CRUD-ендпоінти

```python
@app.post("/bookings", status_code=201)
def create_booking(data: BookingIn, session: SessionDep) -> BookingOut:
    booking = Booking(**data.model_dump())
    session.add(booking)
    session.commit()            # записати в базу
    session.refresh(booking)    # одразу перечитати рядок: id, значення за замовчуванням
    return booking

@app.get("/bookings/{booking_id}")
def get_booking(booking_id: int, session: SessionDep) -> BookingOut:
    booking = session.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking

@app.get("/events/{event_id}/bookings")
def event_bookings(event_id: int, session: SessionDep) -> list[BookingOut]:
    query = select(Booking).where(Booking.event_id == event_id).order_by(Booking.id)
    return session.scalars(query).all()
```

Порядок у створенні: `add` → `commit` → `refresh`. Без `commit()` бронювання зникне разом із сесією, і наступний запит його не знайде. Після `commit()` SQLAlchemy позначає атрибути об'єкта застарілими й перечитає їх при першому зверненні, поки сесія відкрита; `refresh()` просто робить це одразу і явно.

## Унікальність: IntegrityError → 409

Обмеження `unique=True` перевіряє **база** — навіть якщо два запити прийшли одночасно:

```python
from sqlalchemy.exc import IntegrityError

session.add(venue)
try:
    session.commit()
except IntegrityError:
    session.rollback()          # сесія після помилки непридатна, доки не відкотити
    raise HTTPException(status_code=409, detail="Venue name already exists")
```

Перевірка «спершу `SELECT`, потім `INSERT`» теж працює для повідомлення, але не захищає від двох одночасних запитів — останнє слово за обмеженням у базі.

## Звідки беруться таблиці

Для навчальних проєктів і тестів — `Base.metadata.create_all(engine)`: створює таблиці, яких ще немає. У продакшні схему змінюють **міграціями** Alembic (ти бачив(ла) їх у модулі про бази даних), а `create_all` там не викликають.

## Тести на базі в пам'яті

Тест не повинен чіпати справжній файл бази. Підміняємо `get_session` сесією на SQLite у пам'яті:

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

@pytest.fixture
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)

    def test_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = test_session
    yield TestClient(app)
    app.dependency_overrides.clear()
```

Два незвичні аргументи — через **потоки**. `TestClient` викликає звичайні `def`-ендпоінти в окремому робочому потоці, а SQLite у пам'яті живе всередині **одного з'єднання**:

- без `StaticPool` пул SQLAlchemy видає кожному потоку **своє** з'єднання — а отже, свою порожню базу, і ендпоінт падає з `no such table`;
- `StaticPool` тримає одне з'єднання на всіх, а `check_same_thread=False` дозволяє користуватися ним з іншого потоку.

> [!TIP]
> Перевіряй, що зміна **справді збережена**, новою сесією після запиту: `with Session(engine) as fresh: fresh.get(Booking, 1)`. Сесія запиту вже закрита й відкотила все незафіксоване — тож забутий `commit()` тест помітить.

## Типові помилки

| Помилка | Наслідок |
|---|---|
| Забули `commit()` | ендпоінт повертає 201, але дані зникають |
| Ендпоінт сам відкриває `with Session(engine)` і повертає об'єкт після виходу з `with` | `DetachedInstanceError`: атрибути застаріли після `commit()`, а сесії, щоб їх перечитати, уже немає; до того ж тест не може підмінити базу |
| `IntegrityError` без `rollback()` | наступні операції в цій сесії падають з `PendingRollbackError` |
| `BookingOut.model_validate(booking)` без `from_attributes=True` | `ValidationError`: схема чекає словник |
| Тест на `sqlite://` без `StaticPool` | `no such table` — інший потік, інша база |

> [!QA]
> Тести API з базою мають перевіряти три речі: відповідь (статус і тіло), **стан бази** після запиту (новою сесією) і відсутність побічних ефектів у разі помилки — після `409` не має з'явитися жодного нового рядка.

## Підсумок

- Модель SQLAlchemy — таблиця, схема Pydantic — контракт; FastAPI сам читає ORM-об'єкт через модель відповіді, а `model_validate(obj)` потребує `from_attributes=True`.
- `get_session` з `yield` дає кожному запиту свою сесію й закриває її після нього.
- Створення: `add` → `commit` → `refresh`; дубль за `unique` — `IntegrityError` → `rollback()` → `409`.
- У тестах — `dependency_overrides[get_session]` на SQLite у пам'яті з `StaticPool` і `check_same_thread=False`.
