import pytest

from rules import FixedOff, MinTotal, PercentOff
from solution import apply_rule


def test_percent_off_rounds_the_discount_down():
    """Знижка — total * p // 100: 999 * 15 // 100 = 149, отже 850."""
    assert apply_rule(999, PercentOff(15)) == 850


def test_hundred_percent():
    assert apply_rule(500, PercentOff(100)) == 0


@pytest.mark.parametrize("percent", [0, 101, -5])
def test_invalid_percent(percent):
    """Окремий case PercentOff() після case з умовою: ValueError(\"invalid percent\")."""
    with pytest.raises(ValueError, match="invalid percent"):
        apply_rule(1000, PercentOff(percent))


def test_fixed_off():
    assert apply_rule(1000, FixedOff(200)) == 800


def test_fixed_off_never_goes_below_zero():
    """max(total - amount, 0)."""
    assert apply_rule(300, FixedOff(500)) == 0


def test_min_total_applies_the_inner_rule():
    """total >= minimum — застосуй вкладене правило (рекурсивно apply_rule)."""
    assert apply_rule(2500, MinTotal(2000, FixedOff(200))) == 2300


def test_min_total_boundary():
    """Рівно мінімум — правило діє (>=)."""
    assert apply_rule(2000, MinTotal(2000, PercentOff(10))) == 1800


def test_below_the_minimum_nothing_changes():
    assert apply_rule(1999, MinTotal(2000, PercentOff(10))) == 1999


def test_nested_minimums():
    rule = MinTotal(1000, MinTotal(3000, FixedOff(500)))
    assert apply_rule(3500, rule) == 3000
    assert apply_rule(1500, rule) == 1500


def test_unknown_rule():
    """case _: raise TypeError(\"unknown rule\")."""
    with pytest.raises(TypeError, match="unknown rule"):
        apply_rule(1000, "10%")
