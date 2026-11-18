from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

import solution
from promos import Promo

NOW = datetime(2026, 11, 18, 12, 0, tzinfo=UTC)
PROMOS = [
    Promo("SPRING10", "percent", 10, min_subtotal=500, expires_at=NOW + timedelta(days=1)),
    Promo("FLASH", "fixed", 100, expires_at=NOW),
    Promo("MINUS200", "fixed", 200),
]


@pytest.fixture
def client():
    solution.app.dependency_overrides[solution.get_now] = lambda: NOW
    solution.app.dependency_overrides[solution.get_promos] = lambda: PROMOS
    yield TestClient(solution.app)
    solution.app.dependency_overrides.clear()


def post(client, items, code=None):
    body = {"items": [{"sku": sku, "quantity": quantity} for sku, quantity in items]}
    if code is not None:
        body["code"] = code
    return client.post("/quotes", json=body)


def test_without_code(client):
    response = post(client, [("MOUSE-01", 2), ("CABLE-03", 1)])
    assert response.status_code == 200
    assert response.json() == {"subtotal": 1947, "discount": 0, "total": 1947}


def test_percent_code(client):
    """Код без урахування регістру: spring10 → SPRING10, 10 % від 1599 = 159."""
    response = post(client, [("KB-02", 1)], code=" spring10 ")
    assert response.status_code == 200
    assert response.json() == {"subtotal": 1599, "discount": 159, "total": 1440}


def test_repeated_sku_counts_every_line(client):
    """Той самий sku у двох рядках — рахуй обидва."""
    response = post(client, [("CABLE-03", 1), ("CABLE-03", 2)])
    assert response.json()["subtotal"] == 447


@pytest.mark.parametrize("code", ["", "   "])
def test_blank_code_means_no_promo(client, code):
    """Порожній код — без промокоду, а не «unknown»."""
    response = post(client, [("MOUSE-01", 1)], code=code)
    assert response.status_code == 200
    assert response.json()["discount"] == 0


def test_null_code(client):
    response = client.post("/quotes", json={"items": [{"sku": "MOUSE-01", "quantity": 1}], "code": None})
    assert response.status_code == 200


def test_unknown_product(client):
    """Невідомий sku — 400 з кодом unknown_product і самим sku."""
    response = post(client, [("MOUSE-01", 1), ("NOPE-9", 1)])
    assert response.status_code == 400
    assert response.json() == {"detail": {"error": "unknown_product", "sku": "NOPE-9"}}


@pytest.mark.parametrize(
    ("code", "error"),
    [("WINTER", "unknown"), ("FLASH", "expired")],
)
def test_promo_errors(client, code, error):
    """PromoError → 400 {"detail": {"error": <код>}}."""
    response = post(client, [("CAM-01", 1)], code=code)
    assert response.status_code == 400
    assert response.json() == {"detail": {"error": error}}


def test_below_minimum(client):
    response = post(client, [("CABLE-03", 1)], code="SPRING10")
    assert response.status_code == 400
    assert response.json() == {"detail": {"error": "below_minimum"}}


@pytest.mark.parametrize(
    "items",
    [[], [{"sku": "MOUSE-01", "quantity": 0}], [{"sku": "MOUSE-01", "quantity": 100}], [{"sku": "MOUSE-01"}]],
)
def test_validation(client, items):
    """Порожній список, quantity поза 1..99 або без quantity — 422."""
    assert client.post("/quotes", json={"items": items}).status_code == 422


def test_real_clock_is_timezone_aware():
    """Без підміни get_now дає час з поясом: порівняння з датами промокодів не падає."""
    now = solution.get_now()
    assert now.tzinfo is not None
    solution.app.dependency_overrides[solution.get_promos] = lambda: PROMOS[:1]
    try:
        response = TestClient(solution.app, raise_server_exceptions=False).post(
            "/quotes", json={"items": [{"sku": "KB-02", "quantity": 1}], "code": "SPRING10"}
        )
    finally:
        solution.app.dependency_overrides.clear()
    assert response.status_code in (200, 400)


def test_default_dependencies():
    assert solution.get_prices() is solution.PRICES
    assert solution.get_promos() is solution.PROMOS
