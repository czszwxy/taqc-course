import pytest

from solution import User


def test_builds_a_user_from_api_data():
    user = User.from_dict({"id": 7, "email": "anna@example.com", "is_admin": True})
    assert user == User(id=7, email="anna@example.com", is_admin=True)


def test_normalizes_id_and_email():
    """id → int(...), email → .strip().lower()."""
    user = User.from_dict({"id": "42", "email": " QA@Example.COM "})
    assert user == User(id=42, email="qa@example.com")


def test_is_admin_is_optional_and_extra_keys_are_ignored():
    """data.get(\"is_admin\", False); зайві ключі (theme) не передавай у конструктор."""
    user = User.from_dict({"id": 1, "email": "a@b.ua", "theme": "dark"})
    assert user.is_admin is False


def test_missing_id():
    """Спершу перевір id: ValueError(\"missing field: id\")."""
    with pytest.raises(ValueError, match="missing field: id"):
        User.from_dict({"email": "a@b.ua"})


def test_missing_email():
    with pytest.raises(ValueError, match="missing field: email"):
        User.from_dict({"id": 1})


def test_subclass_gets_its_own_class():
    """Створюй через cls(...): Admin.from_dict має повертати Admin, а не User."""

    class Admin(User):
        pass

    admin = Admin.from_dict({"id": 3, "email": "boss@example.com", "is_admin": True})
    assert type(admin) is Admin


def test_to_dict_round_trip():
    data = {"id": 5, "email": "olha@example.com", "is_admin": False}
    assert User.from_dict(data).to_dict() == data
