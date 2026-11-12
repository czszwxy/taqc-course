import pytest

from solution import parse_percent


def test_simple():
    assert parse_percent("15%") == 15


def test_spaces():
    """Прибери % і пробіли: replace("%", "").strip()."""
    assert parse_percent(" 7 % ") == 7


def test_boundaries():
    """0 і 100 — допустимі межі."""
    assert parse_percent("0%") == 0
    assert parse_percent("100%") == 100


def test_too_big():
    """Більше 100 — ValueError з початковим текстом."""
    with pytest.raises(ValueError, match="Invalid percent: '150%'"):
        parse_percent("150%")


def test_not_a_number():
    with pytest.raises(ValueError, match="Invalid percent: 'ten'"):
        parse_percent("ten")


def test_negative():
    with pytest.raises(ValueError, match="Invalid percent"):
        parse_percent("-5%")
