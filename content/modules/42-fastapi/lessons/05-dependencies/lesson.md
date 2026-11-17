# Залежності: Depends

У справжньому API десятки ендпоінтів, і в багатьох потрібне те саме: параметри пагінації, доступ до бази, поточний користувач, поточний час. Копіювати це в кожну функцію — шлях до розбіжностей: десь `limit` до 100, десь до 1000, десь забули перевірити токен. **Залежності** (dependencies) описують таке один раз, а FastAPI сам «підставляє» результат.

## Перша залежність: пагінація

Приклад — список подій з пагінацією:

```python
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, FastAPI, Query

app = FastAPI()

@dataclass
class Page:
    number: int
    size: int

    @property
    def offset(self) -> int:
        return (self.number - 1) * self.size

def pagination(
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=50)] = 10,
) -> Page:
    return Page(number=page, size=size)

PageDep = Annotated[Page, Depends(pagination)]

@app.get("/events")
def list_events(page: PageDep):
    return EVENTS[page.offset : page.offset + page.size]

@app.get("/venues")
def list_venues(page: PageDep):
    return VENUES[page.offset : page.offset + page.size]
```

Що відбувається на `GET /events?page=2&size=5`:

1. FastAPI бачить, що `list_events` потребує `Depends(pagination)`.
2. Викликає `pagination`, беручи **її** параметри з запиту (`page=2`, `size=5`) — з тими самими перевірками й `422`.
3. Результат (`Page(2, 5)`) передає в `list_events` як аргумент `page`.

Залежність — звичайна функція з тими самими правилами параметрів, що й ендпоінт. `PageDep = Annotated[...]` — псевдонім типу, щоб не писати `Depends(...)` щоразу. Межі пагінації тепер в одному місці.

## Ресурси як залежності

Залежність може не читати запит зовсім, а просто **давати ресурс**:

```python
from datetime import datetime, timezone

def get_now() -> datetime:
    return datetime.now(timezone.utc)

def get_repository() -> EventRepository:
    return REPOSITORY

@app.get("/events/upcoming")
def upcoming(repo: Annotated[EventRepository, Depends(get_repository)],
             now: Annotated[datetime, Depends(get_now)]):
    return [e for e in repo.all() if e["starts_at"] > now]
```

Чому не викликати `datetime.now()` і `REPOSITORY` прямо в ендпоінті? Через **тести**. Що поверне `upcoming` о 23:59 перед Новим роком? Чекати не треба — у тесті залежність можна підмінити.

## Заміна залежностей у тестах

```python
from fastapi.testclient import TestClient

def test_upcoming_hides_past_events():
    fixed = datetime(2026, 5, 1, 12, 0, tzinfo=timezone.utc)
    app.dependency_overrides[get_now] = lambda: fixed
    app.dependency_overrides[get_repository] = lambda: EventRepository(TEST_EVENTS)
    try:
        response = TestClient(app).get("/events/upcoming")
        assert [e["id"] for e in response.json()] == [3, 4]
    finally:
        app.dependency_overrides.clear()
```

`app.dependency_overrides` — словник «справжня залежність → заміна». Ключ — **сама функція** (`get_now`, без дужок). Поки заміна діє, FastAPI викликає її замість оригіналу в усіх ендпоінтах. Після тесту — `clear()`, щоб заміна не протекла в інші тести (зручно робити це у фікстурі з `yield`).

> [!IMPORTANT]
> Підмінити можна лише те, що ендпоінт отримує **через `Depends`**. Якщо функція звертається до глобального `REPOSITORY` напряму, жоден override його не замінить — і тест піде в справжню базу.

## Ланцюжки і кешування

Залежність сама може мати залежності:

```python
def get_settings() -> Settings: ...
def get_repository(settings: Annotated[Settings, Depends(get_settings)]) -> EventRepository: ...
def get_current_user(repo: Annotated[EventRepository, Depends(get_repository)], ...) -> User: ...
```

FastAPI будує дерево й обчислює його знизу вгору: `get_settings` → `get_repository` → `get_current_user` → ендпоінт. Якщо одна залежність потрібна в кількох місцях **одного запиту**, вона виконується **один раз**, а результат перевикористовується. Для наступного запиту все обчислюється заново.

## Залежності з yield: відкрити і закрити

Коли ресурс треба звільнити (з'єднання з базою, файл, транзакція), залежність пишуть з `yield`:

```python
def get_connection():
    connection = pool.acquire()       # 1. до запиту
    try:
        yield connection              # 2. значення для ендпоінта
    finally:
        pool.release(connection)      # 3. після ендпоінта — навіть якщо він упав
```

Код до `yield` — підготовка, після — прибирання. `try/finally` гарантує прибирання і тоді, коли ендпоінт підняв виняток. Якщо таких залежностей кілька, закриваються вони у **зворотному** порядку — як вкладені `with`.

## Перевірки без значення

Іноді результат залежності не потрібен — важливо лише, що вона пройшла (або підняла `HTTPException`):

```python
def require_api_key(x_api_key: Annotated[str | None, Header()] = None):
    if x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

@app.post("/events/import", dependencies=[Depends(require_api_key)])
def import_events(): ...
```

`x_api_key` FastAPI читає із заголовка `X-API-Key` (підкреслення стають дефісами).

## Типові помилки

| Помилка | Наслідок |
|---|---|
| `Depends(get_now())` — з дужками | залежність викликається один раз при імпорті; час «застигає» |
| `app.dependency_overrides[get_now()] = ...` | ключ — результат, а не функція: заміна не спрацює |
| Глобальний ресурс напряму в ендпоінті | неможливо підмінити в тестах |
| Override без `clear()` | наступні тести отримують чужу заміну, падають «випадково» |
| `yield` без `try/finally` | ресурс не звільняється, коли ендпоінт падає |

> [!QA]
> Залежності — головний інструмент тестованості API. Час, генератор id, зовнішній платіжний сервіс, відправка email — усе, що в тесті має бути передбачуваним або фальшивим, отримуй через `Depends`. Тоді тест на «акція закінчилась опівночі» займає 5 рядків і не чекає опівночі.

## Підсумок

- `Depends(func)` — FastAPI викликає `func` (з її параметрами з запиту) і передає результат в ендпоінт.
- Псевдонім `Annotated[T, Depends(func)]` прибирає повтори.
- Залежності утворюють дерево; в одному запиті кожна виконується один раз.
- `yield`-залежність: підготовка → значення → прибирання в `finally`.
- `app.dependency_overrides[func] = replacement` підміняє залежність у тестах; після тесту — `clear()`.
