import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import solution
from models import Base, Product

MOUSE = {"sku": "MOUSE-01", "name": "Wireless mouse", "price": 899, "stock": 12}
CABLE = {"sku": "CABLE-C1", "name": "USB-C cable", "price": 299, "stock": 40}


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


def count_products(engine):
    with Session(engine) as fresh:
        return fresh.scalar(select(func.count()).select_from(Product))


def test_get_session_yields_a_session():
    """get_session — yield-залежність, що віддає Session."""
    generator = solution.get_session()
    session = next(generator)
    assert isinstance(session, Session)
    generator.close()


def test_product_out_reads_orm_objects():
    """ProductOut.model_validate(ORM-об'єкт) — потрібен model_config = ConfigDict(from_attributes=True)."""
    product = Product(id=3, sku="HUB-7", name="USB hub", price=749, stock=30)
    assert solution.ProductOut.model_validate(product).model_dump() == {"id": 3, "sku": "HUB-7", "name": "USB hub", "price": 749, "stock": 30}


def test_create_returns_201(client):
    """POST /products — 201 і ProductOut з id від бази."""
    response = client.post("/products", json=MOUSE)
    assert response.status_code == 201
    assert response.json() == {"id": 1, **MOUSE}


def test_create_is_saved(client, engine):
    """Товар має бути в базі після запиту (нова сесія) — не забудь commit()."""
    client.post("/products", json=MOUSE)
    with Session(engine) as fresh:
        saved = fresh.get(Product, 1)
        assert saved is not None and saved.sku == "MOUSE-01"


def test_duplicate_sku_is_409(client, engine):
    """Той самий sku вдруге — 409 "SKU already exists", у базі лишається один товар."""
    client.post("/products", json=MOUSE)
    response = client.post("/products", json={**MOUSE, "name": "Another mouse"})
    assert response.status_code == 409
    assert response.json() == {"detail": "SKU already exists"}
    assert count_products(engine) == 1


def test_works_after_a_conflict(client):
    """Після 409 сесія працює далі (rollback): наступне створення — 201."""
    client.post("/products", json=MOUSE)
    client.post("/products", json=MOUSE)
    assert client.post("/products", json=CABLE).status_code == 201


def test_validation(client):
    """ProductCreate: sku великими літерами/цифрами/дефісом, price >= 1 — інакше 422."""
    assert client.post("/products", json={**MOUSE, "sku": "mouse 1"}).status_code == 422
    assert client.post("/products", json={**MOUSE, "price": 0}).status_code == 422


def test_get_product(client):
    """GET /products/{id} — ProductOut."""
    client.post("/products", json=MOUSE)
    response = client.get("/products/1")
    assert response.status_code == 200
    assert response.json()["name"] == "Wireless mouse"


def test_get_missing_is_404(client):
    """Немає товару — 404 "Product not found"."""
    response = client.get("/products/7")
    assert response.status_code == 404
    assert response.json() == {"detail": "Product not found"}


def test_list_ordered_by_id(client):
    """GET /products — усі товари за id."""
    client.post("/products", json=MOUSE)
    client.post("/products", json=CABLE)
    assert [p["sku"] for p in client.get("/products").json()] == ["MOUSE-01", "CABLE-C1"]


def test_list_max_price(client):
    """?max_price=299 — лише price <= 299 (включно)."""
    client.post("/products", json=MOUSE)
    client.post("/products", json=CABLE)
    assert [p["sku"] for p in client.get("/products?max_price=299").json()] == ["CABLE-C1"]


def test_empty_list(client):
    """Порожня база — порожній список."""
    assert client.get("/products").json() == []


def test_delete(client, engine):
    """DELETE — 204 без тіла, товару більше немає в базі."""
    client.post("/products", json=MOUSE)
    response = client.delete("/products/1")
    assert response.status_code == 204
    assert response.content == b""
    assert count_products(engine) == 0


def test_delete_missing_is_404(client):
    """Видалити неіснуючий — 404."""
    assert client.delete("/products/3").status_code == 404
