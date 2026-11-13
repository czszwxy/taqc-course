import pytest

from subject import format_price


def test_hundreds_have_no_separator():
    assert format_price(450) == "450 UAH"


# твій код тут
