import pytest

from solution import OrderStatus, change_status


def test_members_and_values():
    """П'ять членів з рядковими значеннями."""
    assert [status.value for status in OrderStatus] == ["new", "paid", "shipped", "delivered", "cancelled"]


def test_status_from_an_api_string():
    assert OrderStatus("paid") is OrderStatus.PAID


def test_strenum_equals_its_string():
    """StrEnum — це рядок: OrderStatus.PAID == \"paid\"."""
    assert OrderStatus.PAID == "paid"


@pytest.mark.parametrize(
    "current, target",
    [("new", "paid"), ("new", "cancelled"), ("paid", "shipped"), ("paid", "cancelled"), ("shipped", "delivered")],
)
def test_allowed_transitions(current, target):
    """Дозволений перехід повертає target як член OrderStatus."""
    result = change_status(current, target)
    assert result is OrderStatus(target)


@pytest.mark.parametrize(
    "current, target",
    [("paid", "new"), ("new", "shipped"), ("delivered", "cancelled"), ("cancelled", "paid"), ("new", "new")],
)
def test_forbidden_transitions(current, target):
    """Усе, чого немає у списку дозволених (зокрема в той самий статус), — ValueError."""
    with pytest.raises(ValueError, match=f"cannot change status from {current} to {target}"):
        change_status(current, target)


def test_members_are_accepted_too():
    assert change_status(OrderStatus.SHIPPED, OrderStatus.DELIVERED) is OrderStatus.DELIVERED


def test_unknown_status_is_rejected():
    """Перетвори вхід через OrderStatus(value) — невідоме значення дасть ValueError саме по собі."""
    with pytest.raises(ValueError, match="is not a valid OrderStatus"):
        change_status("new", "lost")
