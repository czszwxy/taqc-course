import pytest

from solution import Money


def test_equal_by_value():
    """Без __eq__ порівнюється ідентичність — напиши __eq__ за amount і currency."""
    assert Money(1200) == Money(1200, "UAH")


def test_different_currency_not_equal():
    assert Money(1200, "UAH") != Money(1200, "USD")


def test_compare_with_other_type():
    """Для чужого типу поверни NotImplemented — тоді == дасть False, а не помилку."""
    assert Money(1200) != 1200


def test_repr():
    assert repr(Money(1200)) == "Money(1200, 'UAH')"


def test_str():
    """str: пробіл між тисячами і валюта."""
    assert str(Money(15000)) == "15 000 UAH"
    assert str(Money(450, "USD")) == "450 USD"


def test_add():
    assert Money(450) + Money(150) == Money(600)


def test_add_different_currencies():
    with pytest.raises(ValueError, match="Cannot add USD to UAH"):
        Money(450) + Money(10, "USD")
