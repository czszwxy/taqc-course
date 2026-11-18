from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import solution
from models import Base, Notification, Ticket

TODAY = date(2026, 3, 18)
OLENA = {"Authorization": "Bearer olena-token"}
TARAS = {"Authorization": "Bearer taras-token"}
STAFF = {"Authorization": "Bearer staff-token"}
PARTS = [{"name": "screen", "price": 2400}, {"name": "back glass", "price": 300, "accidental": True}]


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


def seed(engine, status="received", version=1, customer="olena@example.com", estimate_total=None):
    with Session(engine) as session:
        ticket = Ticket(
            customer_email=customer, device="Phone X2", problem="Cracked screen", priority="normal",
            status=status, received_on=TODAY - timedelta(days=2), due_on=TODAY + timedelta(days=1),
            version=version, estimate_total=estimate_total,
        )
        session.add(ticket)
        session.commit()
        return ticket.id


def saved(engine, ticket_id=1):
    with Session(engine) as fresh:
        ticket = fresh.get(Ticket, ticket_id)
        return ticket.status, ticket.version, ticket.estimate_total, len(ticket.history)


def move(client, status, version, headers=STAFF, ticket_id=1):
    return client.post(f"/tickets/{ticket_id}/status", json={"status": status, "version": version}, headers=headers)


def send_estimate(client, version=1, headers=STAFF, ticket_id=1, **body):
    body = {"parts": PARTS, "labour_minutes": 50, "under_warranty": False, "version": version, **body}
    return client.post(f"/tickets/{ticket_id}/estimate", json=body, headers=headers)


def test_staff_starts_diagnosing(client, engine):
    """POST /tickets/{id}/status → 200 і оновлена заявка (статус, версія + 1, нові actions)."""
    seed(engine)
    response = move(client, "diagnosing", 1)
    assert response.status_code == 200
    body = response.json()
    assert (body["status"], body["version"], body["actions"]) == ("diagnosing", 2, ["waiting_approval", "cancelled"])
    assert saved(engine) == ("diagnosing", 2, None, 1)


def test_customer_cancels_own_ticket(client, engine):
    seed(engine)
    response = move(client, "cancelled", 1, headers=OLENA)
    assert response.status_code == 200
    assert response.json()["actions"] == []


def test_wrong_role_is_403(client, engine):
    """RepairError("forbidden") → 403 {"detail": {"error": "forbidden"}}."""
    seed(engine)
    response = move(client, "diagnosing", 1, headers=OLENA)
    assert response.status_code == 403
    assert response.json() == {"detail": {"error": "forbidden"}}
    assert saved(engine) == ("received", 1, None, 0)


def test_invalid_transition_is_409(client, engine):
    seed(engine)
    response = move(client, "ready", 1)
    assert response.status_code == 409
    assert response.json() == {"detail": {"error": "invalid_transition"}}


def test_stale_version_is_409_conflict(client, engine):
    """Клієнт надіслав стару версію → 409 {"error": "conflict"}, і нічого не змінено."""
    seed(engine, status="diagnosing", version=2)
    response = move(client, "cancelled", 1)
    assert response.status_code == 409
    assert response.json() == {"detail": {"error": "conflict"}}
    assert saved(engine) == ("diagnosing", 2, None, 0)


def test_waiting_approval_only_through_estimate(client, engine):
    """У waiting_approval — лише через /estimate: через /status → 409 estimate_required."""
    seed(engine, status="diagnosing")
    response = move(client, "waiting_approval", 1)
    assert response.status_code == 409
    assert response.json() == {"detail": {"error": "estimate_required"}}


def test_other_customers_ticket_is_404(client, engine):
    """Чужу заявку не можна ні бачити, ні змінювати: 404, а не 403 — і нічого не змінено."""
    seed(engine)
    response = move(client, "cancelled", 1, headers=TARAS)
    assert response.status_code == 404
    assert response.json() == {"detail": {"error": "not_found"}}
    assert saved(engine) == ("received", 1, None, 0)


def test_missing_ticket_is_404(client):
    assert move(client, "diagnosing", 1, ticket_id=99).status_code == 404


@pytest.mark.parametrize("body", [{"status": "lost", "version": 1}, {"status": "diagnosing"}], ids=["unknown-status", "no-version"])
def test_invalid_status_body(client, engine, body):
    """status — тип Status, version обов'язкова → інакше 422."""
    seed(engine)
    assert client.post("/tickets/1/status", json=body, headers=STAFF).status_code == 422


def test_estimate_moves_to_waiting_approval(client, engine):
    """2400 + 300 за деталі, 50 хв = 4 блоки = 600 → estimate_total 3300, статус waiting_approval."""
    seed(engine, status="diagnosing")
    response = send_estimate(client)
    assert response.status_code == 200
    body = response.json()
    assert (body["status"], body["estimate_total"], body["version"]) == ("waiting_approval", 3300, 2)
    assert saved(engine) == ("waiting_approval", 2, 3300, 1)


def test_warranty_estimate(client, engine):
    """Гарантія: робота й звичайні деталі безкоштовні, accidental — платна → 300."""
    seed(engine, status="diagnosing")
    assert send_estimate(client, under_warranty=True).json()["estimate_total"] == 300


def test_free_estimate_is_still_an_estimate(client, engine):
    seed(engine, status="diagnosing")
    response = send_estimate(client, parts=[], labour_minutes=30, under_warranty=True)
    assert (response.status_code, response.json()["estimate_total"]) == (200, 0)


def test_customer_cannot_send_estimate(client, engine):
    seed(engine, status="diagnosing")
    response = send_estimate(client, headers=OLENA)
    assert response.status_code == 403
    assert saved(engine) == ("diagnosing", 1, None, 0)


def test_estimate_in_wrong_status(client, engine):
    """Кошторис — лише в diagnosing: з received → 409 invalid_transition."""
    seed(engine)
    response = send_estimate(client)
    assert response.status_code == 409
    assert response.json() == {"detail": {"error": "invalid_transition"}}


def test_estimate_with_stale_version(client, engine):
    seed(engine, status="diagnosing", version=3)
    response = send_estimate(client, version=2)
    assert response.json() == {"detail": {"error": "conflict"}}
    assert saved(engine) == ("diagnosing", 3, None, 0)


def test_estimate_on_other_customers_ticket(client, engine):
    seed(engine, status="diagnosing", customer="taras@example.com")
    assert send_estimate(client, headers=OLENA).status_code == 404


@pytest.mark.parametrize(
    "changes",
    [
        {"parts": [{"name": "screen", "price": -1}]},
        {"parts": [{"name": "", "price": 100}]},
        {"labour_minutes": -5},
        {"labour_minutes": 601},
    ],
    ids=["negative-price", "no-part-name", "negative-minutes", "too-long"],
)
def test_invalid_estimate(client, engine, changes):
    """Ціна ≥ 0, назва деталі не порожня, labour_minutes від 0 до 600 → інакше 422."""
    seed(engine, status="diagnosing")
    assert send_estimate(client, **changes).status_code == 422
    assert saved(engine) == ("diagnosing", 1, None, 0)


def test_parts_are_optional(client, engine):
    seed(engine, status="diagnosing")
    response = client.post("/tickets/1/estimate", json={"labour_minutes": 15, "version": 1}, headers=STAFF)
    assert (response.status_code, response.json()["estimate_total"]) == (200, 150)


def test_customer_approves(client, engine):
    seed(engine, status="waiting_approval", estimate_total=3300)
    response = move(client, "repairing", 1, headers=OLENA)
    assert (response.status_code, response.json()["status"]) == (200, "repairing")


def test_staff_cannot_approve_for_the_customer(client, engine):
    seed(engine, status="waiting_approval", estimate_total=3300)
    assert move(client, "repairing", 1).status_code == 403


def test_ready_queues_a_notification(client, engine):
    seed(engine, status="repairing")
    assert move(client, "ready", 1).status_code == 200
    with Session(engine) as fresh:
        messages = fresh.scalars(select(Notification)).all()
        assert [(message.recipient, message.status) for message in messages] == [("olena@example.com", "pending")]


def test_history(client, engine):
    """GET /tickets/{id}/history — зміни по порядку: from_status, to_status, by_role, changed_on."""
    seed(engine)
    move(client, "diagnosing", 1)
    send_estimate(client, version=2)
    move(client, "cancelled", 3, headers=OLENA)
    response = client.get("/tickets/1/history", headers=OLENA)
    assert response.status_code == 200
    assert response.json() == [
        {"from_status": "received", "to_status": "diagnosing", "by_role": "staff", "changed_on": "2026-03-18"},
        {"from_status": "diagnosing", "to_status": "waiting_approval", "by_role": "staff", "changed_on": "2026-03-18"},
        {"from_status": "waiting_approval", "to_status": "cancelled", "by_role": "customer", "changed_on": "2026-03-18"},
    ]


def test_history_of_a_new_ticket_is_empty(client, engine):
    seed(engine)
    assert client.get("/tickets/1/history", headers=STAFF).json() == []


def test_history_of_other_customers_ticket(client, engine):
    seed(engine)
    assert client.get("/tickets/1/history", headers=TARAS).status_code == 404


def test_full_repair(client, engine):
    """Увесь шлях заявки через API: створення → діагностика → кошторис → згода → ремонт → видача."""
    created = client.post("/tickets", json={"device": "Tablet S", "problem": "Battery drains fast"}, headers=OLENA)
    ticket_id = created.json()["id"]
    steps = [
        ("status", {"status": "diagnosing"}, STAFF),
        ("estimate", {"parts": [{"name": "battery", "price": 900}], "labour_minutes": 30}, STAFF),
        ("status", {"status": "repairing"}, OLENA),
        ("status", {"status": "ready"}, STAFF),
        ("status", {"status": "closed"}, STAFF),
    ]
    version = 1
    for path, body, headers in steps:
        response = client.post(f"/tickets/{ticket_id}/{path}", json={**body, "version": version}, headers=headers)
        assert response.status_code == 200, (path, body, response.json())
        version = response.json()["version"]
    final = client.get(f"/tickets/{ticket_id}", headers=OLENA).json()
    assert (final["status"], final["estimate_total"], final["version"]) == ("closed", 1200, 6)
