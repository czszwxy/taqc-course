import pytest

from subject import ApiError, AuthError, NotFoundError, raise_for_status


def test_success_raises_nothing():
    assert raise_for_status(200, "/api/orders") is None


def test_399_is_not_an_error():
    assert raise_for_status(399, "/api/orders") is None


@pytest.mark.parametrize("status", [401, 403])
def test_auth_errors(status):
    with pytest.raises(AuthError):
        raise_for_status(status, "/api/admin")


def test_not_found_details():
    with pytest.raises(NotFoundError) as exc_info:
        raise_for_status(404, "/api/users/7")
    assert exc_info.value.status == 404
    assert exc_info.value.url == "/api/users/7"
    assert str(exc_info.value) == "404 for /api/users/7"


def test_server_error_is_base_api_error():
    with pytest.raises(ApiError):
        raise_for_status(500, "/api/orders")
