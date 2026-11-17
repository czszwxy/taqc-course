# Тести і структура API

Поки API — один файл на сто рядків, усе просто. Коли ендпоінтів стає тридцять, з'являються питання: де шукати код, як не зламати одне, змінюючи інше, і як переконатися, що все працює, не клацаючи Swagger UI годину. Відповідь — **тести** й **структура**. І те, й інше бекенд-розробник робить сам(а), не чекаючи тестувальника.

## Тести API з pytest

Ти вже бачив(ла) `TestClient` у кожній задачі модуля — тепер тести пишеш ти. Приклад — API тікетів служби підтримки:

```python
# tests/test_tickets.py
import pytest
from fastapi.testclient import TestClient

from app.main import app, TICKETS

@pytest.fixture
def client():
    TICKETS.clear()                    # свіжий стан для кожного тесту
    return TestClient(app)

def test_create_ticket(client):
    response = client.post("/tickets", json={"title": "Printer is offline", "priority": 2})
    assert response.status_code == 201
    assert response.json() == {"id": 1, "title": "Printer is offline", "priority": 2, "closed": False}

def test_missing_ticket_is_404(client):
    response = client.get("/tickets/42")
    assert response.status_code == 404
    assert response.json() == {"detail": "Ticket not found"}

@pytest.mark.parametrize("priority", [0, 6, "high"])
def test_priority_validation(client, priority):
    response = client.post("/tickets", json={"title": "Broken chair", "priority": priority})
    assert response.status_code == 422
```

Що варто перевіряти в кожному ендпоінті:

| Що | Приклад |
|---|---|
| Статус | `201`, а не просто «не впало» |
| Тіло цілком | `== {...}` ловить і зайві поля (витік!), і відсутні |
| Стан після запиту | `GET` після `POST` / `DELETE`; для бази — нова сесія |
| Кожна помилка | `404`, `409`, `422`, `401` / `403` зі своїм тілом |
| Межі | `0`, `1`, максимум, максимум + 1 |
| Заголовки | `WWW-Authenticate`, `Location`, `Content-Type` |

**Ізоляція.** Кожен тест має починати з відомого стану: очищені словники, свіжа база в пам'яті (урок 6), підмінені залежності з `clear()` після тесту (урок 5). Тест, що залежить від іншого тесту, рано чи пізно впаде «сам по собі».

> [!TIP]
> Тест, що проходить на зламаному коді, нічого не варт. Перевір свій тест: тимчасово зламай ендпоінт (`201` → `200`, прибери перевірку) — тест має почервоніти. У наступній задачі курс зробить це за тебе: твої тести запустять на кількох зламаних версіях API.

## Структура проєкту

```text
helpdesk/
├── app/
│   ├── main.py          # app = FastAPI(lifespan=...), include_router(...)
│   ├── config.py        # Settings — налаштування з середовища
│   ├── database.py      # engine
│   ├── deps.py          # get_session, get_current_agent, pagination — спільні залежності
│   ├── models.py        # моделі SQLAlchemy (таблиці)
│   ├── schemas.py       # схеми Pydantic (контракт API)
│   └── routers/
│       ├── tickets.py   # ендпоінти /tickets
│       └── agents.py    # ендпоінти /agents
├── tests/
│   ├── conftest.py      # фікстури: тестова база, client, overrides
│   └── test_tickets.py
└── pyproject.toml
```

Кожен файл відповідає на одне питання: «як виглядає таблиця?» — `models.py`, «що приймає API?» — `schemas.py`, «які є ендпоінти тікетів?» — `routers/tickets.py`.

## APIRouter

`APIRouter` — «маленький застосунок» з частиною маршрутів:

```python
# app/routers/tickets.py
from fastapi import APIRouter, Depends

router = APIRouter(prefix="/tickets", tags=["tickets"])

@router.get("")                       # GET /tickets
def list_tickets(): ...

@router.get("/{ticket_id}")           # GET /tickets/7
def get_ticket(ticket_id: int): ...
```

```python
# app/main.py
from fastapi import FastAPI
from app.routers import agents, tickets

app = FastAPI(title="Help desk")
app.include_router(tickets.router)
app.include_router(agents.router, dependencies=[Depends(require_supervisor)])
```

- `prefix` додається до всіх шляхів роутера — його не повторюють у кожному декораторі.
- `tags` групують ендпоінти в Swagger UI.
- `dependencies=[...]` на роутері (або в `include_router`) діють на **всі** його ендпоінти — зручно для «уся адмінка — лише для адміністраторів».

## Налаштування з середовища

Ключі, адреса бази, режим налагодження відрізняються на твоєму комп'ютері, на staging і в продакшні. У код їх не пишуть — читають зі змінних середовища. Для цього є `pydantic-settings` (він уже в лабораторії):

```python
# app/config.py
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="HELPDESK_")

    database_url: str = "sqlite:///./helpdesk.db"
    sla_hours: int = 24

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

`Settings()` читає `HELPDESK_DATABASE_URL` і `HELPDESK_SLA_HOURS` (регістр не важливий) і перевіряє типи: `HELPDESK_SLA_HOURS=abc` дасть зрозумілу помилку валідації, щойно налаштування прочитають, а не дивну поведінку посеред ночі. Щоб це сталося вже при старті, виклич `get_settings()` у `lifespan` (нижче). `@lru_cache` — щоб не читати середовище на кожен запит. `get_settings` використовують як залежність, а в тестах підміняють: `app.dependency_overrides[get_settings] = lambda: Settings(sla_hours=1)`.

## Lifespan: старт і зупинка

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)    # перед першим запитом
    yield
    engine.dispose()                    # при зупинці сервера

app = FastAPI(lifespan=lifespan)
```

Код до `yield` виконується при старті сервера, після — при зупинці. `TestClient` запускає lifespan, лише коли його використовують як контекстний менеджер: `with TestClient(app) as client: ...`.

## Типові помилки

| Помилка | Наслідок |
|---|---|
| Тести ділять глобальний стан | порядок тестів змінює результат |
| Перевіряєш лише `status_code` | витік поля чи зламаний формат помилки не помітний |
| Роутер створено, але не `include_router` | усі його маршрути — `404` |
| `prefix="/tickets"` і `@router.get("/tickets")` | шлях стає `/tickets/tickets` |
| Секрети в `config.py` за замовчуванням для продакшну | вони потрапляють у git |

> [!QA]
> Добрий набір тестів API — це специфікація, яку можна запустити: прочитавши назви тестів, колега розуміє, що API обіцяє. Назви на кшталт `test_cancel_shipped_order_is_409` кажуть більше, ніж `test_cancel_2`.

## Підсумок

- Фікстура `client` + свіжий стан на кожен тест; перевіряй статус, тіло цілком, стан після запиту й кожну помилку.
- Структура: `main` збирає застосунок, `routers/` — ендпоінти, `schemas` / `models` / `deps` — контракт, таблиці, спільні залежності, `tests/conftest.py` — фікстури.
- `APIRouter(prefix=..., tags=..., dependencies=[...])` + `app.include_router(...)`.
- `pydantic-settings` читає налаштування з середовища з перевіркою типів; `get_settings` з `lru_cache` — залежність, яку легко підмінити.
- `lifespan` — код при старті й зупинці; у тестах — `with TestClient(app)`.
