import pytest

from solution import parse_result


def test_simple_line():
    assert parse_result("test_login;passed;1.25") == ("test_login", "passed", 1.25)


def test_strips_spaces():
    """Прибери пробіли навколо кожної частини: strip()."""
    assert parse_result(" test_cart ; failed ; 3.4 ") == ("test_cart", "failed", 3.4)


def test_duration_is_float():
    """Тривалість — число: float(duration)."""
    name, status, duration = parse_result("a;passed;2")
    assert isinstance(duration, float)


def test_wrong_line():
    """Не три частини — розпакування саме підніме ValueError."""
    with pytest.raises(ValueError):
        parse_result("broken line")
