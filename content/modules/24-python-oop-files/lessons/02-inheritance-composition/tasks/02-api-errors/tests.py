import pytest

from solution import ApiError, AuthError, NotFoundError, raise_for_status


def test_hierarchy():
    assert issubclass(ApiError, Exception)
    assert issubclass(AuthError, ApiError)
    assert issubclass(NotFoundError, ApiError)


def test_success_statuses():
    """До 400 — нічого не піднімати."""
    assert raise_for_status(200, "/api/users/42") is None
    assert raise_for_status(399, "/api/users/42") is None


def test_not_found_details():
    """ApiError зберігає status і url як атрибути."""
    with pytest.raises(NotFoundError) as exc:
        raise_for_status(404, "/api/users/7")
    assert exc.value.status == 404
    assert exc.value.url == "/api/users/7"


def test_message():
    """Повідомлення — через super().__init__(f"{status} for {url}")."""
    with pytest.raises(ApiError) as exc:
        raise_for_status(404, "/api/users/7")
    assert str(exc.value) == "404 for /api/users/7"


@pytest.mark.parametrize("status", [401, 403])
def test_auth_errors(status):
    with pytest.raises(AuthError):
        raise_for_status(status, "/api/admin")


def test_other_errors_are_base_api_error():
    """400, 500 та інші — саме ApiError, не підклас."""
    for status in (400, 500, 502):
        with pytest.raises(ApiError) as exc:
            raise_for_status(status, "/api/orders")
        assert type(exc.value) is ApiError


def test_base_class_catches_subclasses():
    """except ApiError ловить і NotFoundError — бо це різновид ApiError."""
    with pytest.raises(ApiError):
        raise_for_status(404, "/api/users/7")
