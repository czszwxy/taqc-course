from unittest.mock import Mock

import pytest

from subject import get_with_retry


def test_returns_response_on_first_try():
    get = Mock(return_value={"ok": True})
    assert get_with_retry(get, "/api/health") == {"ok": True}


# твій код тут
