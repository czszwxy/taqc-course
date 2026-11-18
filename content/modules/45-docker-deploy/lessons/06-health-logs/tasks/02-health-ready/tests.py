import asyncio

import pytest
from fastapi.testclient import TestClient

import solution

FAST_TIMEOUT = 0.3
SLOW_SECONDS = 5


class Probe:
    """Fake checks that count how many run at the same time."""

    def __init__(self):
        self.running = 0
        self.peak = 0
        self.calls = []
        self.cancelled = []

    def check(self, name, outcome="ok"):
        async def run():
            self.calls.append(name)
            self.running += 1
            self.peak = max(self.peak, self.running)
            try:
                await asyncio.sleep(0)
                if outcome == "slow":
                    await asyncio.sleep(SLOW_SECONDS)
                if outcome == "error":
                    raise ConnectionError("password authentication failed for user shop_admin")
            except asyncio.CancelledError:
                self.cancelled.append(name)
                raise
            finally:
                self.running -= 1

        return run


@pytest.fixture
def fast_timeout():
    solution.app.dependency_overrides[solution.get_check_timeout] = lambda: FAST_TIMEOUT
    yield FAST_TIMEOUT
    solution.app.dependency_overrides.clear()


def use_checks(**outcomes):
    probe = Probe()
    checks = {name: probe.check(name, outcome) for name, outcome in outcomes.items()}
    solution.app.dependency_overrides[solution.get_checks] = lambda: checks
    return probe


@pytest.fixture
def client():
    with TestClient(solution.app) as http:
        yield http


def test_health_ok(client):
    """GET /health — 200 {"status": "ok"}."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_ignores_dependencies(fast_timeout, client):
    """/health не запускає перевірок: база впала — процес живий."""
    checks = use_checks(database="error", payments="slow")
    assert client.get("/health").status_code == 200
    assert checks.calls == []


def test_ready_all_ok(fast_timeout, client):
    """Усі перевірки ok — 200 з результатом кожної."""
    use_checks(database="ok", payments="ok")
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "checks": {"database": "ok", "payments": "ok"}}


def test_ready_failure_is_503(fast_timeout, client):
    """Виняток у перевірці — "fail" і 503 "not ready"."""
    use_checks(database="error", payments="ok")
    response = client.get("/ready")
    assert response.status_code == 503
    assert response.json() == {"status": "not ready", "checks": {"database": "fail", "payments": "ok"}}


def test_error_text_not_leaked(fast_timeout, client):
    """Текст винятку (тут — ім'я користувача бази) не потрапляє у відповідь."""
    use_checks(database="error")
    body = client.get("/ready").text
    assert "shop_admin" not in body
    assert "password" not in body


def test_slow_check_times_out(fast_timeout, client):
    """Перевірка, що не вклалась у get_check_timeout(), — "timeout" (не "fail"), і її зупинено."""
    checks = use_checks(database="ok", payments="slow")
    response = client.get("/ready")
    assert response.status_code == 503
    assert response.json()["checks"] == {"database": "ok", "payments": "timeout"}
    assert checks.cancelled == ["payments"]


def test_checks_run_at_once(fast_timeout, client):
    """Перевірки йдуть одночасно: пік дорівнює їх кількості."""
    checks = use_checks(database="ok", payments="ok", cache="ok", search="ok")
    client.get("/ready")
    assert sorted(checks.calls) == ["cache", "database", "payments", "search"]
    assert checks.peak == 4


def test_every_check_runs_even_after_failure(fast_timeout, client):
    """Помилка однієї перевірки не скасовує інші — у відповіді є всі."""
    use_checks(database="error", payments="slow", cache="ok")
    response = client.get("/ready")
    assert response.json()["checks"] == {"database": "fail", "payments": "timeout", "cache": "ok"}


def test_no_checks_is_ready(fast_timeout, client):
    """Порожній словник перевірок — 200 ready."""
    use_checks()
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "checks": {}}


def test_default_dependencies():
    """Без підміни: справжні перевірки з checks.py і ліміт 1 секунда."""
    assert solution.get_checks() is solution.CHECKS
    assert solution.get_check_timeout() == 1.0
    with TestClient(solution.app) as http:
        assert http.get("/ready").json() == {"status": "ready", "checks": {"database": "ok", "payments": "ok"}}
