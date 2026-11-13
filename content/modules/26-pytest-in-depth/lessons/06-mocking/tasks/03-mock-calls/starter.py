from unittest.mock import Mock, call

from subject import notify_failed


def test_single_failure_counts_one():
    assert notify_failed([("test_cart", "failed")], Mock()) == 1


# твій код тут
