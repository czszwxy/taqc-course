import pytest

from subject import Inventory


@pytest.fixture
def inventory():
    return Inventory()


@pytest.fixture
def stocked(inventory):
    inventory.add("MOUSE", 5)
    inventory.add("CABLE", 2)
    return inventory


def test_new_inventory_has_nothing(inventory):
    assert inventory.available("MOUSE") == 0


def test_adding_twice_accumulates(stocked):
    stocked.add("MOUSE", 3)
    assert stocked.available("MOUSE") == 8


def test_reserve_reduces_stock(stocked):
    stocked.reserve("MOUSE", 2)
    assert stocked.available("MOUSE") == 3


def test_reserve_everything_left(stocked):
    stocked.reserve("CABLE", 2)
    assert stocked.available("CABLE") == 0


def test_reserve_more_than_available_fails(stocked):
    with pytest.raises(ValueError):
        stocked.reserve("CABLE", 3)
