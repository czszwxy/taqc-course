"""Checks after every test that it deleted the orders it created."""

import pytest

from subject import API


@pytest.fixture(autouse=True)
def no_leftover_orders():
    yield
    leftovers = sorted(API.orders)
    API.orders.clear()
    assert not leftovers, f"the test left orders behind: {leftovers} — delete them in the fixture after yield"
