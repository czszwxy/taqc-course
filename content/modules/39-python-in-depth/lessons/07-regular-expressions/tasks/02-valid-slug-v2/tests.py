import pytest

from solution import is_valid_order_code


@pytest.mark.parametrize("code", ["ORD-2026-000123", "ORD-2000-000000", "ORD-2099-999999"])
def test_valid_codes(code):
    assert is_valid_order_code(code) is True


def test_prefix_is_case_sensitive():
    assert is_valid_order_code("ord-2026-000123") is False


@pytest.mark.parametrize("code", ["ORD-1999-000123", "ORD-2100-000123", "ORD-26-000123"])
def test_year_must_be_2000_to_2099(code):
    """Рік — 20 і ще дві цифри: 20\\d{2}."""
    assert is_valid_order_code(code) is False


@pytest.mark.parametrize("code", ["ORD-2026-00123", "ORD-2026-0001234"])
def test_number_has_exactly_six_digits(code):
    assert is_valid_order_code(code) is False


@pytest.mark.parametrize("code", ["ORD-2026-000123\n", " ORD-2026-000123", "ORD-2026-000123 ", "xORD-2026-000123"])
def test_nothing_extra_around(code):
    """fullmatch: нічого до і після коду."""
    assert is_valid_order_code(code) is False
