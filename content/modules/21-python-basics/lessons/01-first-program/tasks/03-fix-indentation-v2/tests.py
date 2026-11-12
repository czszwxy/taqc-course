from solution import is_failed


def test_failed():
    assert is_failed("failed") is True


def test_other_statuses():
    """Для інших статусів — False."""
    assert is_failed("passed") is False
    assert is_failed("skipped") is False
