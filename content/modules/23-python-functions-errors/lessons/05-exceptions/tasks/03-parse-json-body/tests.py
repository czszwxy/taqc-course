import json

import pytest

from errors import ApiError
from solution import parse_json_body


def test_valid_object():
    assert parse_json_body('{"id": 42}') == {"id": 42}


def test_valid_list():
    assert parse_json_body("[1, 2]") == [1, 2]


def test_html_raises_api_error():
    """Не JSON — ApiError, а не json.JSONDecodeError: перехопи і підніми свій виняток."""
    with pytest.raises(ApiError, match="Response is not JSON: <html>502 Bad Gateway</html>"):
        parse_json_body("<html>502 Bad Gateway</html>")


def test_message_cut_to_30_chars():
    """У повідомленні — лише перші 30 символів: text[:30]."""
    text = "<!DOCTYPE html><html><head><title>Server error</title></head></html>"
    with pytest.raises(ApiError) as exc:
        parse_json_body(text)
    assert str(exc.value) == "Response is not JSON: " + text[:30]


def test_cause_is_kept():
    """Збережи початкову помилку: raise ApiError(...) from e."""
    with pytest.raises(ApiError) as exc:
        parse_json_body("oops")
    assert isinstance(exc.value.__cause__, json.JSONDecodeError)


def test_empty_body():
    with pytest.raises(ApiError):
        parse_json_body("")
