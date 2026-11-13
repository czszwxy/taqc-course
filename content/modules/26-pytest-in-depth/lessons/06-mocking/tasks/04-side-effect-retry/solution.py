from unittest.mock import Mock

import pytest

from subject import get_with_retry


def test_returns_response_on_first_try():
    get = Mock(return_value={"ok": True})
    assert get_with_retry(get, "/api/health") == {"ok": True}


def test_retries_until_success():
    get = Mock(side_effect=[ConnectionError(), ConnectionError(), {"ok": True}])
    assert get_with_retry(get, "/api/health") == {"ok": True}
    assert get.call_count == 3


def test_gives_up_after_all_attempts():
    get = Mock(side_effect=ConnectionError("down"))
    with pytest.raises(ConnectionError):
        get_with_retry(get, "/api/health")
    assert get.call_count == 3


def test_other_errors_are_not_retried():
    get = Mock(side_effect=ValueError("bad json"))
    with pytest.raises(ValueError):
        get_with_retry(get, "/api/health")
    assert get.call_count == 1
