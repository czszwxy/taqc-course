from solution import active_emails

USERS = [
    {"email": "QA@Gadgetly.test", "active": True},
    {"email": "old@gadgetly.test", "active": False},
    {"email": "dev@gadgetly.test", "active": True},
]


def test_active_only():
    """Лише активні: фільтр if u["active"] після for."""
    assert active_emails(USERS) == ["qa@gadgetly.test", "dev@gadgetly.test"]


def test_lowercase():
    """Email у нижньому регістрі: u["email"].lower()."""
    assert active_emails([{"email": "A@B.TEST", "active": True}]) == ["a@b.test"]


def test_none_active():
    assert active_emails([{"email": "x@y.test", "active": False}]) == []


def test_empty():
    assert active_emails([]) == []
