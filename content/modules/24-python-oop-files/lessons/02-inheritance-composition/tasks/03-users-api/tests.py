import pytest

from session import FakeSession
from solution import UsersApi

BASE = "https://api.test"
QA = {"id": 42, "email": "qa@example.test"}
DEV = {"id": 17, "email": "dev@example.test"}


def make_api():
    session = FakeSession({
        f"{BASE}/users/42": (200, QA),
        f"{BASE}/users/17": (200, DEV),
        f"{BASE}/users/500": (500, {"error": "boom"}),
    })
    return UsersApi(session, BASE), session


def test_found():
    api, session = make_api()
    assert api.get_user(42) == QA


def test_requested_url():
    """URL запиту: f"{self.base_url}/users/{user_id}"."""
    api, session = make_api()
    api.get_user(42)
    assert session.requests == [f"{BASE}/users/42"]


def test_not_found_is_none():
    api, session = make_api()
    assert api.get_user(7) is None


def test_server_error():
    """Інший статус — RuntimeError з URL і статусом."""
    api, session = make_api()
    with pytest.raises(RuntimeError, match="GET https://api.test/users/500 failed: 500"):
        api.get_user(500)


def test_emails_skip_missing():
    """emails використовує get_user і пропускає None."""
    api, session = make_api()
    assert api.emails([42, 7, 17]) == ["qa@example.test", "dev@example.test"]
    assert len(session.requests) == 3
