from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import solution
from models import Base, Ticket

TODAY = date(2026, 3, 18)  # середа
OLENA = {"Authorization": "Bearer olena-token"}
TARAS = {"Authorization": "Bearer taras-token"}
STAFF = {"Authorization": "Bearer staff-token"}
SCREEN = {"device": "Phone X2", "problem": "Cracked screen", "priority": "urgent"}


@pytest.fixture
def engine():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    return engine


@pytest.fixture
def client(engine):
    def test_session():
        with Session(engine) as session:
            yield session

    solution.app.dependency_overrides[solution.get_session] = test_session
    solution.app.dependency_overrides[solution.get_today] = lambda: TODAY
    yield TestClient(solution.app)
    solution.app.dependency_overrides.clear()


def seed(engine, customer="olena@example.com", status="received", due_in=3):
    with Session(engine) as session:
        ticket = Ticket(
            customer_email=customer, device="Laptop Pro", problem="Does not charge", priority="normal",
            status=status, received_on=TODAY - timedelta(days=5), due_on=TODAY + timedelta(days=due_in),
        )
        session.add(ticket)
        session.commit()
        return ticket.id


def ids(response):
    return [item["id"] for item in response.json()["items"]]


def test_create_ticket(client):
    """POST /tickets → 201, Location і заявка: email з токена, строк з due_date, статус received."""
    response = client.post("/tickets", json=SCREEN, headers=OLENA)
    assert response.status_code == 201
    assert response.headers["location"] == "/tickets/1"
    assert response.json() == {
        "id": 1,
        "customer_email": "olena@example.com",
        "device": "Phone X2",
        "problem": "Cracked screen",
        "priority": "urgent",
        "status": "received",
        "received_on": "2026-03-18",
        "due_on": "2026-03-19",
        "estimate_total": None,
        "version": 1,
        "overdue": False,
        "actions": ["cancelled"],
    }


def test_ticket_is_saved(client, engine):
    """Заявка зафіксована (commit): її бачить новий Session після запиту."""
    client.post("/tickets", json=SCREEN, headers=OLENA)
    with Session(engine) as fresh:
        ticket = fresh.get(Ticket, 1)
        assert ticket is not None, "після запиту заявки в базі немає — забув(ла) session.commit()?"
        assert (ticket.customer_email, ticket.due_on) == ("olena@example.com", date(2026, 3, 19))


def test_default_priority_is_normal(client):
    """Без priority — "normal": середа + 3 робочі дні = понеділок 23-го."""
    response = client.post("/tickets", json={"device": "Phone X2", "problem": "No sound"}, headers=OLENA)
    assert response.json()["priority"] == "normal"
    assert response.json()["due_on"] == "2026-03-23"


def test_text_is_trimmed(client):
    """Пробіли на краях device і problem обрізаються (str_strip_whitespace=True)."""
    response = client.post("/tickets", json={"device": "  Phone X2 ", "problem": " No sound  "}, headers=OLENA)
    assert (response.json()["device"], response.json()["problem"]) == ("Phone X2", "No sound")


@pytest.mark.parametrize(
    "body",
    [
        {"device": "X", "problem": "Cracked screen"},
        {"device": "   ", "problem": "Cracked screen"},
        {"device": "D" * 61, "problem": "Cracked screen"},
        {"device": "Phone X2", "problem": "Bad"},
        {"device": "Phone X2", "problem": "P" * 501},
        {"device": "Phone X2", "problem": "Cracked screen", "priority": "asap"},
        {"device": "Phone X2", "problem": "Cracked screen", "customer_email": "taras@example.com"},
        {"problem": "Cracked screen"},
    ],
    ids=["device-short", "device-blank", "device-long", "problem-short", "problem-long", "priority", "extra-field", "no-device"],
)
def test_invalid_body(client, engine, body):
    """Невалідне тіло → 422 (Pydantic), і нічого не збережено. Зайві поля теж відхиляються (extra="forbid")."""
    assert client.post("/tickets", json=body, headers=OLENA).status_code == 422
    with Session(engine) as fresh:
        assert fresh.scalar(select(func.count()).select_from(Ticket)) == 0


@pytest.mark.parametrize("headers", [{}, {"Authorization": "Bearer nope"}], ids=["no-token", "bad-token"])
def test_needs_a_token(client, headers):
    """Без токена або з невідомим — 401 від get_current_user."""
    assert client.post("/tickets", json=SCREEN, headers=headers).status_code == 401
    assert client.get("/tickets", headers=headers).status_code == 401
    assert client.get("/tickets/1", headers=headers).status_code == 401


def test_staff_cannot_create(client, engine):
    """Заявки створюють клієнти; staff → 403 {"detail": {"error": "forbidden"}}."""
    response = client.post("/tickets", json=SCREEN, headers=STAFF)
    assert response.status_code == 403
    assert response.json() == {"detail": {"error": "forbidden"}}
    with Session(engine) as fresh:
        assert fresh.scalar(select(func.count()).select_from(Ticket)) == 0


def test_get_own_ticket(client, engine):
    seed(engine)
    response = client.get("/tickets/1", headers=OLENA)
    assert response.status_code == 200
    assert response.json()["device"] == "Laptop Pro"


def test_other_customers_ticket_is_not_found(client, engine):
    """Чужа заявка — 404, а не 403: не розкриваємо, що такий id існує."""
    seed(engine)
    response = client.get("/tickets/1", headers=TARAS)
    assert response.status_code == 404
    assert response.json() == {"detail": {"error": "not_found"}}


def test_missing_ticket(client):
    response = client.get("/tickets/99", headers=STAFF)
    assert response.status_code == 404
    assert response.json() == {"detail": {"error": "not_found"}}


def test_staff_sees_any_ticket_with_staff_actions(client, engine):
    """actions — next_statuses для ролі того, хто питає: у staff інші кнопки, ніж у клієнта."""
    seed(engine)
    assert client.get("/tickets/1", headers=STAFF).json()["actions"] == ["diagnosing", "cancelled"]
    assert client.get("/tickets/1", headers=OLENA).json()["actions"] == ["cancelled"]


@pytest.mark.parametrize(
    ("status", "due_in", "overdue"),
    [("diagnosing", -1, True), ("diagnosing", 0, False), ("waiting_approval", -1, False), ("ready", -4, False)],
)
def test_overdue_flag(client, engine, status, due_in, overdue):
    """overdue = is_overdue(due_on, today, status), де today — з get_today."""
    seed(engine, status=status, due_in=due_in)
    assert client.get("/tickets/1", headers=STAFF).json()["overdue"] is overdue


def test_customer_lists_only_own_tickets(client, engine):
    """Клієнт у списку бачить лише свої заявки, і total рахує лише їх."""
    seed(engine)
    seed(engine, customer="taras@example.com")
    seed(engine)
    response = client.get("/tickets", headers=OLENA)
    assert response.status_code == 200
    assert ids(response) == [1, 3]
    assert response.json()["total"] == 2


def test_staff_lists_everything(client, engine):
    """Staff бачить усі заявки — у порядку з репозиторію (спершу ближчий дедлайн)."""
    seed(engine, due_in=4)
    seed(engine, customer="taras@example.com", due_in=1)
    response = client.get("/tickets", headers=STAFF)
    assert ids(response) == [2, 1]
    assert response.json()["total"] == 2


def test_status_filter(client, engine):
    seed(engine)
    seed(engine, status="ready")
    response = client.get("/tickets", params={"status": "ready"}, headers=STAFF)
    assert ids(response) == [2]


def test_unknown_status_filter(client):
    """status у запиті — тип Status: невідоме значення → 422."""
    assert client.get("/tickets", params={"status": "lost"}, headers=STAFF).status_code == 422


def test_overdue_filter_uses_today(client, engine):
    """?overdue=true — лише прострочені на дату з get_today (overdue_on=today у search)."""
    seed(engine, due_in=-2)
    seed(engine, due_in=0)
    seed(engine, due_in=-2, status="waiting_approval")
    response = client.get("/tickets", params={"overdue": "true"}, headers=STAFF)
    assert ids(response) == [1]
    assert response.json()["items"][0]["overdue"] is True


def test_pagination(client, engine):
    for day in range(5):
        seed(engine, due_in=day)
    response = client.get("/tickets", params={"limit": 2, "offset": 2}, headers=STAFF)
    assert ids(response) == [3, 4]
    assert response.json()["total"] == 5


@pytest.mark.parametrize("params", [{"limit": 0}, {"limit": 51}, {"offset": -1}])
def test_pagination_bounds(client, params):
    """limit від 1 до 50 (за замовчуванням 20), offset ≥ 0 — інакше 422."""
    assert client.get("/tickets", params=params, headers=STAFF).status_code == 422


def test_default_limit(client, engine):
    for _ in range(22):
        seed(engine)
    body = client.get("/tickets", headers=STAFF).json()
    assert (len(body["items"]), body["total"]) == (20, 22)


def test_list_items_have_actions(client, engine):
    seed(engine)
    body = client.get("/tickets", headers=OLENA).json()
    assert set(body) == {"items", "total"}
    assert body["items"][0]["actions"] == ["cancelled"]
