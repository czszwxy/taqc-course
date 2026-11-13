import pytest

from subject import API


@pytest.fixture
def order():
    order_id = API.create_order(["Mouse"])
    yield order_id
    API.delete_order(order_id)


def test_new_order_is_created(order):
    assert API.get_order(order)["status"] == "created"


def test_order_cannot_be_paid_twice(order):
    API.pay(order)
    with pytest.raises(ValueError):
        API.pay(order)


def test_unpaid_order_cannot_be_shipped(order):
    with pytest.raises(ValueError):
        API.ship(order)


def test_shipped_order_cannot_be_cancelled(order):
    API.pay(order)
    API.ship(order)
    with pytest.raises(ValueError):
        API.cancel(order)


def test_empty_order_is_rejected():
    with pytest.raises(ValueError):
        API.create_order([])
