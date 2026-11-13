import pytest

from subject import API


@pytest.fixture
def order():
    return API.create_order(["Mouse"])


def test_new_order_is_created(order):
    assert API.get_order(order)["status"] == "created"


# твій код тут
