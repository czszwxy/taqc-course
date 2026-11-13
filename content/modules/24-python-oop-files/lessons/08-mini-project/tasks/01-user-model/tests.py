import dataclasses

import pytest

from solution import InvalidUserError, User, user_from_dict


def test_user_is_dataclass_with_defaults():
    """User — dataclass; role і active мають значення за замовчуванням."""
    assert dataclasses.is_dataclass(User)
    assert User(1, "qa@example.test") == User(id=1, email="qa@example.test", role="customer", active=True)


def test_full_record():
    user = user_from_dict({"id": 7, "email": "admin@example.test", "role": "admin", "active": False})
    assert user == User(7, "admin@example.test", "admin", False)


def test_email_is_normalized():
    """Email: strip().lower()."""
    assert user_from_dict({"id": 1, "email": " QA@Example.test "}).email == "qa@example.test"


def test_extra_keys_ignored():
    assert user_from_dict({"id": 1, "email": "a@example.test", "created_at": "2026-11-13"}) == User(1, "a@example.test")


@pytest.mark.parametrize("field", ["id", "email"])
def test_missing_field(field):
    """Відсутній ключ — InvalidUserError("missing field: <name>")."""
    data = {"id": 1, "email": "a@example.test"}
    del data[field]
    with pytest.raises(InvalidUserError, match=f"missing field: {field}"):
        user_from_dict(data)


def test_id_must_be_int():
    with pytest.raises(InvalidUserError, match="id must be an integer"):
        user_from_dict({"id": "1", "email": "a@example.test"})


def test_invalid_email():
    """Повідомлення містить нормалізований email у лапках."""
    with pytest.raises(InvalidUserError, match="invalid email: 'qa.example.test'"):
        user_from_dict({"id": 1, "email": " QA.example.test"})


def test_unknown_role():
    with pytest.raises(InvalidUserError, match="unknown role: 'root'"):
        user_from_dict({"id": 1, "email": "a@example.test", "role": "root"})


def test_error_type():
    assert issubclass(InvalidUserError, Exception)
