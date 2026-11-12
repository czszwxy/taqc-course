from solution import user_city


def test_full_path():
    assert user_city({"data": {"user": {"address": {"city": "Kyiv"}}}}) == "Kyiv"


def test_address_none():
    """address = None: використай (user.get("address") or {}), бо .get("address", {}) поверне None."""
    assert user_city({"data": {"user": {"address": None}}}) is None


def test_no_address_key():
    assert user_city({"data": {"user": {}}}) is None


def test_user_none():
    """user = None — теж не падай: or {} на кожному рівні."""
    assert user_city({"data": {"user": None}}) is None


def test_empty_response():
    """Немає навіть data — None."""
    assert user_city({}) is None


def test_city_missing():
    assert user_city({"data": {"user": {"address": {"zip": "01001"}}}}) is None
