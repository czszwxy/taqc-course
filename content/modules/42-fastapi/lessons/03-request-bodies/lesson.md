# Тіло запиту і моделі Pydantic

Параметри шляху й запиту — це короткі значення: id, фільтр, номер сторінки. Коли клієнт **створює** щось — бронювання, замовлення, користувача, — він надсилає JSON у **тілі** запиту. У FastAPI тіло описують класом Pydantic, і ти отримуєш готовий перевірений об'єкт замість сирого словника.

## Модель тіла

Приклад — бронювання місць на подію:

```python
from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict, Field

app = FastAPI()

class BookingIn(BaseModel):
    model_config = ConfigDict(extra="forbid")   # невідомі поля — помилка

    event_id: int
    seats: int = Field(ge=1, le=6)
    name: str = Field(min_length=2, max_length=60)
    comment: str | None = Field(default=None, max_length=200)

@app.post("/bookings", status_code=201)
def create_booking(booking: BookingIn):
    return {"event_id": booking.event_id, "seats": booking.seats}
```

Аргумент типу `BaseModel` FastAPI бере **з тіла** (параметри шляху й запиту — зі шляху й рядка). Усередині функції `booking.seats` — уже `int` у межах 1–6. Якщо щось не так, функція не викликається, а клієнт отримує `422`:

```json
{"detail": [
  {"type": "greater_than_equal", "loc": ["body", "seats"], "msg": "Input should be greater than or equal to 1", "input": 0},
  {"type": "extra_forbidden", "loc": ["body", "promo"], "msg": "Extra inputs are not permitted", "input": "FREE"}
]}
```

`loc` починається з `"body"` — помилка в тілі, далі шлях до поля. Pydantic повідомляє про **всі** помилки одразу, не лише про першу.

- `status_code=201` — «Created»: правильна відповідь на успішне створення (детальніше — в уроці 4).
- `extra="forbid"` ловить друкарські помилки клієнта: `"seat": 2` замість `"seats"` не загубиться мовчки.

## Вкладені моделі і списки

```python
class Attendee(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr                      # перевірка формату email (пакет email-validator)

class GroupBookingIn(BaseModel):
    event_id: int
    attendees: list[Attendee] = Field(min_length=1, max_length=10)
```

Помилка в другому учасникові матиме `loc: ["body", "attendees", 1, "email"]` — видно навіть індекс у списку.

> [!WARNING]
> `EmailStr` відхиляє зарезервовані домени на кшталт `.test` чи `.localhost`: `anna@shop.test` — «special-use or reserved name». У тестах з `EmailStr` бери `example.com`.

## Модель відповіді: що бачить клієнт

У базі в користувача є `password_hash`, у бронювання — `internal_note` для менеджерів. Віддавати це клієнту не можна. **Тип повернення** функції стає моделлю відповіді — FastAPI пропустить через неї результат і **відкине все зайве**:

```python
class BookingOut(BaseModel):
    id: int
    event_id: int
    seats: int

BOOKINGS: dict[int, dict] = {}

@app.post("/bookings", status_code=201)
def create_booking(booking: BookingIn) -> BookingOut:
    new_id = len(BOOKINGS) + 1
    stored = {"id": new_id, **booking.model_dump(), "internal_note": "VIP"}
    BOOKINGS[new_id] = stored
    return stored            # internal_note, name і comment у відповідь не потраплять
```

Те саме можна записати як `@app.post(..., response_model=BookingOut)` — так роблять, коли функція повертає інший тип (наприклад, `dict`), а анотацію хочеться лишити чесною. `model_dump()` перетворює модель на звичайний `dict`.

## Окремі моделі для різних задач

| Модель | Для чого | Типові поля |
|---|---|---|
| `BookingCreate` / `BookingIn` | що клієнт надсилає при створенні | без `id`, з паролем, якщо треба |
| `BookingOut` | що клієнт отримує | `id`, без секретів і службових полів |
| `BookingUpdate` | часткова зміна (PATCH) | усі поля необов'язкові |

Спільні поля виносять у базовий клас (`class BookingBase(BaseModel)`) і наслідуються від нього — так обмеження не дублюються.

## Нормалізація: field_validator

`EmailStr` сам прибирає пробіли по краях і переводить у нижній регістр **домен** — але не частину до `@`: `"  Olha@Example.COM "` стане `"Olha@example.com"`. Тоді `Olha@...` і `olha@...` — «два різні» користувачі. Доведемо нормалізацію валідатором:

```python
from pydantic import field_validator

class SpeakerIn(BaseModel):
    email: EmailStr
    phone: str = Field(pattern=r"^\+380\d{9}$")

    @field_validator("email")
    @classmethod
    def lower_email(cls, value: str) -> str:
        return value.lower()

    @field_validator("phone", mode="before")
    @classmethod
    def drop_spaces(cls, value):
        return value.replace(" ", "") if isinstance(value, str) else value
```

- За замовчуванням (`mode="after"`) валідатор отримує **вже перевірене** значення потрібного типу — тут гарантовано валідний email.
- `mode="before"` отримує **сирий** вхід (будь-якого типу) ще до перевірки: `"+380 67 123 45 67"` спершу втратить пробіли, а вже потім пройде `pattern`. Тому в ньому перевіряють `isinstance`.

## Часткове оновлення: PATCH

`PUT` замінює ресурс повністю, `PATCH` змінює лише надіслані поля. Головне питання PATCH — відрізнити «поле не надіслали» від «надіслали `null`»:

```python
class BookingUpdate(BaseModel):
    seats: int | None = Field(default=None, ge=1, le=6)
    comment: str | None = None

@app.patch("/bookings/{booking_id}")
def update_booking(booking_id: int, changes: BookingUpdate) -> BookingOut:
    stored = BOOKINGS[booking_id]
    stored.update(changes.model_dump(exclude_unset=True))
    return stored
```

| Тіло запиту | `model_dump()` | `model_dump(exclude_unset=True)` |
|---|---|---|
| `{"seats": 3}` | `{"seats": 3, "comment": None}` — стер би коментар! | `{"seats": 3}` |
| `{"comment": null}` | `{"seats": None, "comment": None}` | `{"comment": None}` — свідомо очистити |

`exclude_unset=True` лишає тільки поля, які клієнт **справді надіслав**.

## Типові помилки

| Помилка | Наслідок |
|---|---|
| Повертаєш внутрішній `dict` без моделі відповіді | у JSON витікають `password_hash`, службові поля |
| `model_dump()` без `exclude_unset` у PATCH | неочікувано стираються поля, яких не надсилали |
| Перевірки вручну `if seats < 1:` замість `Field(ge=1)` | розходяться з документацією, легко забути одну |
| Тіло приймаєш як `dict` | немає перевірки, немає схеми в Swagger UI |
| Одна модель на все (з `id` і паролем) | клієнт може надіслати свій `id`, а пароль повернеться у відповіді |

> [!QA]
> Модель — це контракт, і з нього народжуються тести: межі кожного `Field` (0, 1, 6, 7), відсутнє обов'язкове поле, зайве поле, неправильний тип, порожній список, і перевірка, що відповідь **не містить** секретів. Останній тест часто забувають — а витік `password_hash` ловиться лише так.

## Підсумок

- Аргумент-модель Pydantic FastAPI читає з тіла; невалідне тіло — `422` з `loc: ["body", ...]`.
- `Field(ge=, le=, min_length=, max_length=)` — межі; `extra="forbid"` — без невідомих полів.
- Тип повернення (або `response_model=`) фільтрує відповідь: клієнт бачить лише поля моделі.
- Розділяй моделі: Create / Out / Update; спільне — у базовий клас.
- `field_validator` нормалізує дані (`after` — уже перевірене значення, `before` — сирий вхід); у PATCH — `model_dump(exclude_unset=True)`.
