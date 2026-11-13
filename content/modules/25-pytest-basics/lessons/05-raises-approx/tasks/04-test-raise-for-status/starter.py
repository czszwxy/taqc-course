import pytest

from subject import ApiError, AuthError, NotFoundError, raise_for_status


def test_success_raises_nothing():
    assert raise_for_status(200, "/api/orders") is None


# твій код тут
