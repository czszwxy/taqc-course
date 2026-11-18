import time

import pytest
from fastapi.testclient import TestClient

from fakes import FakeDatabase
from solution import create_app

NEVER = 3600
QUICK = 0.02
WAIT_LIMIT_SECONDS = 2


@pytest.fixture
def database():
    return FakeDatabase()


def test_startup_connects(database):
    """На старті база підключена, /ready — 200."""
    app = create_app(database, flush_every=NEVER)
    with TestClient(app) as client:
        assert database.journal == ["connect"]
        response = client.get("/ready")
        assert response.status_code == 200
        assert response.json() == {"status": "ready"}


def test_ready_503_when_database_lost(database):
    """База відвалилась (connected False) — /ready 503."""
    app = create_app(database, flush_every=NEVER)
    with TestClient(app) as client:
        database.connected = False
        response = client.get("/ready")
        assert response.status_code == 503
        assert response.json() == {"status": "not ready"}


def test_post_event_queues(database):
    """POST /events — 202 і кількість подій у черзі; до flush у базі нічого."""
    app = create_app(database, flush_every=NEVER)
    with TestClient(app) as client:
        first = client.post("/events", json={"type": "order_paid", "order_id": 1001})
        second = client.post("/events", json={"type": "product_viewed", "sku": "MOUSE-01"})
        assert (first.status_code, first.json()) == (202, {"queued": 1})
        assert second.json() == {"queued": 2}
        assert app.state.pending == [{"type": "order_paid", "order_id": 1001}, {"type": "product_viewed", "sku": "MOUSE-01"}]
        assert database.saved == []


def test_background_flush(database):
    """Фонова задача кожні flush_every секунд зберігає накопичене одним списком."""
    app = create_app(database, flush_every=QUICK)
    with TestClient(app) as client:
        client.post("/events", json={"type": "order_paid", "order_id": 1})
        client.post("/events", json={"type": "order_paid", "order_id": 2})
        deadline = time.monotonic() + WAIT_LIMIT_SECONDS
        while not database.saved and time.monotonic() < deadline:
            time.sleep(QUICK)
        assert [event["order_id"] for event in database.saved] == [1, 2]
        assert app.state.pending == []
    assert "save 0" not in database.journal, "порожню чергу не зберігають"


def test_final_flush_on_shutdown(database):
    """Події, що чекали в черзі, збережено при зупинці — нічого не загубилось."""
    app = create_app(database, flush_every=NEVER)
    with TestClient(app) as client:
        client.post("/events", json={"type": "order_paid", "order_id": 7})
        client.post("/events", json={"type": "order_paid", "order_id": 8})
    assert [event["order_id"] for event in database.saved] == [7, 8]


def test_shutdown_order(database):
    """Зупинка: останній flush, потім close — і саме в такому порядку."""
    app = create_app(database, flush_every=NEVER)
    with TestClient(app) as client:
        client.post("/events", json={"type": "order_paid", "order_id": 9})
    assert database.journal == ["connect", "save 1", "close"]
    assert database.connected is False


def test_nothing_to_flush_on_shutdown(database):
    """Порожня черга — без save, лише close."""
    app = create_app(database, flush_every=NEVER)
    with TestClient(app):
        pass
    assert database.journal == ["connect", "close"]


def test_flusher_stopped_before_close(database):
    """Фонова задача зупинена і ДОЧЕКАНА до database.close() (cancel() без очікування — замало)."""
    app = create_app(database, flush_every=NEVER)
    seen = []
    original_close = database.close

    async def close():
        seen.append(app.state.flusher.done())
        await original_close()

    database.close = close
    with TestClient(app):
        assert app.state.flusher.done() is False, "фонова задача має працювати, поки застосунок запущено"
    assert seen == [True]
