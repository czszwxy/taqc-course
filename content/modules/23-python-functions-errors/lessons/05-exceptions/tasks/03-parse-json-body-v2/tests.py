import pytest

from solution import to_int_list


def test_converts():
    """int() сам прибирає пробіли з країв: " 7 " → 7."""
    assert to_int_list(["1", " 7 ", "12"]) == [1, 7, 12]


def test_error_has_position():
    """Номер з 1 і значення в лапках: Item 2 is not a number: 'abc'."""
    with pytest.raises(ValueError, match="Item 2 is not a number: 'abc'"):
        to_int_list(["1", "abc", "x"])


def test_first_item():
    with pytest.raises(ValueError, match="Item 1 is not a number: ''"):
        to_int_list(["", "2"])


def test_empty():
    assert to_int_list([]) == []
