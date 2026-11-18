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


# твій код тут
