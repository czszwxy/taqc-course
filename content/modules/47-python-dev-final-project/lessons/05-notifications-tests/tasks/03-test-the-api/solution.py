from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import subject
from models import Base, Ticket

TODAY = date(2026, 3, 18)  # середа
OLENA = {"Authorization": "Bearer olena-token"}
TARAS = {"Authorization": "Bearer taras-token"}
STAFF = {"Authorization": "Bearer staff-token"}


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

    subject.app.dependency_overrides[subject.get_session] = test_session
    subject.app.dependency_overrides[subject.get_today] = lambda: TODAY
    yield TestClient(subject.app)
    subject.app.dependency_overrides.clear()


def seed(engine, customer="olena@example.com", status="received", due_in=3):
    """Кладе заявку прямо в базу (минаючи API) і повертає її id."""
    with Session(engine) as session:
        ticket = Ticket(
            customer_email=customer, device="Laptop Pro", problem="Does not charge", priority="normal",
            status=status, received_on=TODAY - timedelta(days=5), due_on=TODAY + timedelta(days=due_in),
        )
        session.add(ticket)
        session.commit()
        return ticket.id


def test_create_returns_201(client):
    response = client.post("/tickets", json={"device": "Phone X2", "problem": "Cracked screen"}, headers=OLENA)
    assert response.status_code == 201


@pytest.mark.parametrize(("priority", "due_on"), [("urgent", "2026-03-19"), ("low", "2026-03-25")])
def test_due_date_follows_priority(client, priority, due_on):
    body = {"device": "Phone X2", "problem": "Cracked screen", "priority": priority}
    assert client.post("/tickets", json=body, headers=OLENA).json()["due_on"] == due_on


def test_customer_cannot_open_other_customers_ticket(client, engine):
    seed(engine, customer="taras@example.com")
    assert client.get("/tickets/1", headers=OLENA).status_code == 404


def test_customer_lists_only_own_tickets(client, engine):
    seed(engine)
    seed(engine, customer="taras@example.com")
    body = client.get("/tickets", headers=TARAS).json()
    assert [item["id"] for item in body["items"]] == [2]
    assert body["total"] == 1


def test_wrong_role_is_403(client, engine):
    seed(engine)
    response = client.post("/tickets/1/status", json={"status": "diagnosing", "version": 1}, headers=OLENA)
    assert response.status_code == 403


def test_overdue_filter(client, engine):
    seed(engine, due_in=-1)
    seed(engine, due_in=2)
    body = client.get("/tickets", params={"overdue": "true"}, headers=STAFF).json()
    assert [item["id"] for item in body["items"]] == [1]


def test_estimate_counts_labour(client, engine):
    seed(engine, status="diagnosing")
    body = {"parts": [{"name": "battery", "price": 900}], "labour_minutes": 16, "version": 1}
    response = client.post("/tickets/1/estimate", json=body, headers=STAFF)
    assert response.json()["estimate_total"] == 1200
