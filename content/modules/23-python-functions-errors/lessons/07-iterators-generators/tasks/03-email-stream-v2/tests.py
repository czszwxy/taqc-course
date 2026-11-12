import types

from solution import backoff


def test_is_generator():
    assert isinstance(backoff(100, 1, 1000), types.GeneratorType)


def test_doubles_and_caps():
    """Подвоюй затримку і обмежуй зверху: min(delay, cap)."""
    assert list(backoff(100, 5, 1000)) == [100, 200, 400, 800, 1000]


def test_cap_below_base():
    assert list(backoff(100, 3, 50)) == [50, 50, 50]


def test_zero_attempts():
    assert list(backoff(100, 0, 1000)) == []
