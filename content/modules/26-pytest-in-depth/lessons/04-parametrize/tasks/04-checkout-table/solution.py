import pytest

from subject import checkout_error


@pytest.mark.parametrize("total, logged_in, has_address, expected", [
    (500, True, True, ""),
    (500, False, True, "login required"),
    (0, False, True, "login required"),
    (0, True, False, "cart is empty"),
    (500, True, False, "address required"),
    (99, True, True, "minimum order is 100"),
    (100, True, True, ""),
])
def test_checkout_error(total, logged_in, has_address, expected):
    assert checkout_error(total, logged_in, has_address) == expected
