import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import solution
from models import Base, Customer, Order

ANNA = {"email": "anna@example.com", "name": "Anna"}
IVAN = {"email": "ivan@example.com", "name": "Ivan"}


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
    yield TestClient(solution.app)
    solution.app.dependency_overrides.clear()


def count(engine, model):
    with Session(engine) as fresh:
        return fresh.scalar(select(func.count()).select_from(model))


def test_create_customer(client, engine):
    """POST /customers — 201, {"id", "email", "name"}, і покупець у базі."""
    response = client.post("/customers", json=ANNA)
    assert response.status_code == 201
    assert response.json() == {"id": 1, **ANNA}
    assert count(engine, Customer) == 1


def test_duplicate_email_is_409(client, engine):
    """Той самий email — 409 "Email already registered", у базі один покупець."""
    client.post("/customers", json=ANNA)
    response = client.post("/customers", json={**ANNA, "name": "Anna B."})
    assert response.status_code == 409
    assert response.json() == {"detail": "Email already registered"}
    assert count(engine, Customer) == 1
    assert client.post("/customers", json=IVAN).status_code == 201


def test_create_order(client, engine):
    """POST /customers/1/orders — 201 {"id", "customer_id", "total"} і замовлення в базі."""
    client.post("/customers", json=ANNA)
    response = client.post("/customers/1/orders", json={"total": 1198})
    assert response.status_code == 201
    assert response.json() == {"id": 1, "customer_id": 1, "total": 1198}
    assert count(engine, Order) == 1


def test_order_for_missing_customer_is_404(client, engine):
    """Немає покупця — 404 "Customer not found", замовлення не створюється."""
    response = client.post("/customers/5/orders", json={"total": 100})
    assert response.status_code == 404
    assert response.json() == {"detail": "Customer not found"}
    assert count(engine, Order) == 0


def test_order_total_validation(client):
    """total >= 1 — інакше 422."""
    client.post("/customers", json=ANNA)
    assert client.post("/customers/1/orders", json={"total": 0}).status_code == 422


def test_customer_orders(client):
    """GET /customers/1/orders — лише замовлення цього покупця, за id."""
    client.post("/customers", json=ANNA)
    client.post("/customers", json=IVAN)
    client.post("/customers/1/orders", json={"total": 500})
    client.post("/customers/2/orders", json={"total": 700})
    client.post("/customers/1/orders", json={"total": 900})
    assert [o["id"] for o in client.get("/customers/1/orders").json()] == [1, 3]


def test_orders_of_missing_customer_is_404(client):
    """Список замовлень неіснуючого покупця — 404."""
    assert client.get("/customers/9/orders").status_code == 404


def test_customer_summary(client):
    """GET /customers/1 — з orders_count і orders_total."""
    client.post("/customers", json=ANNA)
    client.post("/customers/1/orders", json={"total": 500})
    client.post("/customers/1/orders", json={"total": 900})
    assert client.get("/customers/1").json() == {"id": 1, **ANNA, "orders_count": 2, "orders_total": 1400}


def test_summary_without_orders(client):
    """Без замовлень — orders_count 0 і orders_total 0."""
    client.post("/customers", json=IVAN)
    assert client.get("/customers/1").json() == {"id": 1, **IVAN, "orders_count": 0, "orders_total": 0}


def test_missing_customer_is_404(client):
    """Неіснуючий покупець — 404 "Customer not found"."""
    response = client.get("/customers/4")
    assert response.status_code == 404
    assert response.json() == {"detail": "Customer not found"}
