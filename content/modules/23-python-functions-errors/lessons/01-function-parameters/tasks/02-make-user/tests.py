from solution import make_user

DEFAULTS = {"email": "user@example.test", "password": "Secret123", "role": "customer", "active": True}


def test_defaults():
    assert make_user() == DEFAULTS


def test_override():
    """Перевизначені поля замінюють defaults: user.update(overrides)."""
    assert make_user(role="admin", active=False) == {**DEFAULTS, "role": "admin", "active": False}


def test_extra_field():
    """Нове поле, якого немає в defaults, теж додається."""
    assert make_user(city="Kyiv") == {**DEFAULTS, "city": "Kyiv"}


def test_calls_do_not_share_state():
    """Кожен виклик — новий словник: створюй defaults усередині функції."""
    admin = make_user(role="admin")
    admin["email"] = "changed@example.test"
    assert make_user() == DEFAULTS
