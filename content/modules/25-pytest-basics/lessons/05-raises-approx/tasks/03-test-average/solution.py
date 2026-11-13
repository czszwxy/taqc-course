import pytest

from subject import average


def test_whole_average():
    assert average([2, 4]) == 3


def test_fractional_average():
    assert average([1, 2]) == pytest.approx(1.5)


def test_long_fraction_is_not_rounded():
    assert average([1, 2, 2]) == pytest.approx(5 / 3)


def test_empty_list_is_rejected():
    with pytest.raises(ValueError):
        average([])
