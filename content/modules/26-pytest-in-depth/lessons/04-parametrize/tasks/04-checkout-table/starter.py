import pytest

from subject import checkout_error


@pytest.mark.parametrize("total, logged_in, has_address, expected", [
    (500, True, True, ""),
    # твій код тут
])
def test_checkout_error(total, logged_in, has_address, expected):
    assert checkout_error(total, logged_in, has_address) == expected
