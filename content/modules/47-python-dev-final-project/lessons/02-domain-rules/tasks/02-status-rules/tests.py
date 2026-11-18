import pytest

from solution import CUSTOMER, STAFF, RepairError, Status, change_status, next_statuses

ALLOWED = [
    ("received", "diagnosing", STAFF),
    ("received", "cancelled", CUSTOMER),
    ("received", "cancelled", STAFF),
    ("diagnosing", "waiting_approval", STAFF),
    ("diagnosing", "cancelled", STAFF),
    ("waiting_approval", "repairing", CUSTOMER),
    ("waiting_approval", "cancelled", CUSTOMER),
    ("repairing", "ready", STAFF),
    ("ready", "closed", STAFF),
]


def code_of(current, new, role):
    with pytest.raises(RepairError) as caught:
        change_status(current, new, role)
    return caught.value.code


@pytest.mark.parametrize(("current", "new", "role"), ALLOWED)
def test_allowed_changes(current, new, role):
    """Кожен рядок таблиці переходів має бути в TRANSITIONS з потрібною роллю."""
    assert change_status(current, new, role) == Status(new)


def test_returns_a_status():
    """change_status повертає Status, навіть якщо статуси прийшли рядками з бази."""
    assert change_status("repairing", "ready", STAFF) is Status.READY


@pytest.mark.parametrize(
    ("current", "new", "role"),
    [
        ("received", "diagnosing", CUSTOMER),
        ("diagnosing", "waiting_approval", CUSTOMER),
        ("diagnosing", "cancelled", CUSTOMER),
        ("waiting_approval", "repairing", STAFF),
        ("waiting_approval", "cancelled", STAFF),
        ("repairing", "ready", CUSTOMER),
        ("ready", "closed", CUSTOMER),
    ],
)
def test_wrong_role_is_forbidden(current, new, role):
    """Перехід існує, але не для цієї ролі → RepairError з кодом "forbidden"."""
    assert code_of(current, new, role) == "forbidden"


@pytest.mark.parametrize(
    ("current", "new"),
    [
        ("received", "ready"),
        ("received", "received"),
        ("diagnosing", "repairing"),
        ("ready", "repairing"),
        ("closed", "received"),
        ("cancelled", "diagnosing"),
        ("repairing", "cancelled"),
    ],
)
def test_missing_transition_is_invalid(current, new):
    """Переходу немає в таблиці → "invalid_transition" для будь-якої ролі (навіть для staff)."""
    assert code_of(current, new, STAFF) == "invalid_transition"
    assert code_of(current, new, CUSTOMER) == "invalid_transition"


def test_error_is_an_exception_with_code():
    """RepairError — підклас Exception з атрибутом code; str(error) — сам код."""
    error = RepairError("forbidden")
    assert isinstance(error, Exception)
    assert error.code == "forbidden"
    assert str(error) == "forbidden"


def test_unknown_status_is_a_value_error():
    """Невідомий статус — помилка програміста, а не бізнес-правило: Status("lost") кидає ValueError."""
    with pytest.raises(ValueError):
        change_status("lost", "ready", STAFF)


@pytest.mark.parametrize(
    ("current", "role", "expected"),
    [
        ("received", CUSTOMER, ["cancelled"]),
        ("received", STAFF, ["diagnosing", "cancelled"]),
        ("diagnosing", STAFF, ["waiting_approval", "cancelled"]),
        ("diagnosing", CUSTOMER, []),
        ("waiting_approval", CUSTOMER, ["repairing", "cancelled"]),
        ("waiting_approval", STAFF, []),
        ("repairing", STAFF, ["ready"]),
        ("closed", STAFF, []),
        ("cancelled", CUSTOMER, []),
    ],
)
def test_next_statuses(current, role, expected):
    """Кнопки для інтерфейсу: куди ця роль може перевести заявку, у порядку оголошення Status."""
    assert next_statuses(current, role) == expected
