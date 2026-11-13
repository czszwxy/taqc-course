import pytest

from subject import format_price


def test_hundreds_have_no_separator():
    assert format_price(450) == "450 UAH"


def test_thousands_have_a_space():
    assert format_price(1200) == "1 200 UAH"


@pytest.mark.xfail(strict=True, reason="QA-17: separators in millions")
def test_millions_have_two_spaces():
    assert format_price(1234567) == "1 234 567 UAH"
