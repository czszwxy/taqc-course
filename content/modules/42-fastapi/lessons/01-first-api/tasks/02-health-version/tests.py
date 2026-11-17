from fastapi.testclient import TestClient

from solution import app

client = TestClient(app)


def test_health():
    """GET /health має повернути {"status": "ok"} — перевір шлях і декоратор @app.get("/health")."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_version():
    """GET /version: name = "gadget-shop", version — рядок "1.4.0"."""
    response = client.get("/version")
    assert response.status_code == 200
    assert response.json() == {"name": "gadget-shop", "version": "1.4.0"}


def test_root():
    """Корінь — шлях "/" з message і docs."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Gadget shop API", "docs": "/docs"}


def test_unknown_path_is_404():
    """Інших маршрутів бути не повинно: невідомий шлях — 404."""
    assert client.get("/healthz").status_code == 404


def test_health_is_get_only():
    """POST на GET-маршрут має дати 405 — не реєструй /health для інших методів."""
    assert client.post("/health").status_code == 405
