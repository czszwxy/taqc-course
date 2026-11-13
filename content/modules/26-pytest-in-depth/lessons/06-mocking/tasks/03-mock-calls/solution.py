from unittest.mock import Mock, call

from subject import notify_failed

MIXED = [("test_login", "failed"), ("test_cart", "passed"), ("test_search", "failed")]


def test_single_failure_counts_one():
    assert notify_failed([("test_cart", "failed")], Mock()) == 1


def test_one_message_per_failure():
    send = Mock()
    notify_failed(MIXED, send)
    assert send.call_args_list == [call("FAILED: test_login"), call("FAILED: test_search")]


def test_no_messages_when_all_passed():
    send = Mock()
    notify_failed([("test_login", "passed")], send)
    send.assert_not_called()


def test_returns_number_of_failures():
    assert notify_failed(MIXED, Mock()) == 2
