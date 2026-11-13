import pytest

from subject import Inventory


@pytest.fixture
def inventory():
    return Inventory()


def test_new_inventory_has_nothing(inventory):
    assert inventory.available("MOUSE") == 0


# твій код тут
