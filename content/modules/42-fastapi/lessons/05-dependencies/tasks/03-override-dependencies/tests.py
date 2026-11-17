from datetime import date, datetime, timezone

import pytest
from fastapi.testclient import TestClient

import solution
from repository import REPOSITORY, ProductRepository

NOW = datetime(2026, 5, 10, 9, 30, tzinfo=timezone.utc)
TEST_PRODUCTS = [
    {"id": 10, "name": "Old dock", "price": 2999, "added": date(2026, 5, 2)},
    {"id": 11, "name": "Week-old hub", "price": 749, "added": date(2026, 5, 3)},
    {"id": 12, "name": "Fresh webcam", "price": 1999, "added": date(2026, 5, 10)},
]


@pytest.fixture
def repo():
    return ProductRepository(TEST_PRODUCTS)


@pytest.fixture
def client(repo):
    solution.app.dependency_overrides[solution.get_repository] = lambda: repo
    solution.app.dependency_overrides[solution.get_now] = lambda: NOW
    yield TestClient(solution.app)
    solution.app.dependency_overrides.clear()


def test_get_repository_returns_the_real_one():
    """Без заміни get_repository() повертає бойовий REPOSITORY."""
    assert solution.get_repository() is REPOSITORY


def test_get_now_is_current_utc_time():
    """get_now() — поточний час з часовою зоною UTC."""
    now = solution.get_now()
    assert now.tzinfo is not None and now.utcoffset().total_seconds() == 0
    assert abs((datetime.now(timezone.utc) - now).total_seconds()) < 60


def test_list_uses_the_dependency(client):
    """GET /products бере сховище через Depends(get_repository): тест бачить свої товари 10–12, а не бойові."""
    assert [p["id"] for p in client.get("/products").json()] == [10, 11, 12]


def test_new_products_window(client):
    """Нові — за 7 днів включно: 3 травня (рівно 7 днів тому) — так, 2 травня (8 днів) — ні."""
    assert [p["id"] for p in client.get("/products/new").json()] == [11, 12]


def test_new_products_use_the_injected_time(client):
    """Межа рахується від часу з get_now: на 17 травня новий лише товар від 10 травня."""
    solution.app.dependency_overrides[solution.get_now] = lambda: datetime(2026, 5, 17, tzinfo=timezone.utc)
    assert [p["id"] for p in client.get("/products/new").json()] == [12]


def test_add_product(client, repo):
    """POST /products — 201, товар у підміненому сховищі, added = дата з get_now."""
    response = client.post("/products", json={"name": "Desk lamp", "price": 1199})
    assert response.status_code == 201
    assert response.json() == {"id": 13, "name": "Desk lamp", "price": 1199, "added": "2026-05-10"}
    assert repo.get(13)["name"] == "Desk lamp"


def test_add_does_not_touch_the_real_repository(client):
    """Під час тесту бойовий REPOSITORY не змінюється."""
    client.post("/products", json={"name": "Desk lamp", "price": 1199})
    assert [p["id"] for p in REPOSITORY.all()] == [1, 2]


def test_price_validation(client):
    """price >= 1 — інакше 422."""
    assert client.post("/products", json={"name": "Free thing", "price": 0}).status_code == 422
