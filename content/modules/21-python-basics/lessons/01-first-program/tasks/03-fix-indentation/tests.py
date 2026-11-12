from solution import is_passed


def test_passed():
    """Для "passed" функція має повернути True."""
    assert is_passed("passed") is True


def test_failed():
    """Для будь-якого іншого статусу — False."""
    assert is_passed("failed") is False
    assert is_passed("skipped") is False
