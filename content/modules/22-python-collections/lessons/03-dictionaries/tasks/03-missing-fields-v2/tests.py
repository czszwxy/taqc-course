from solution import unexpected_fields


def test_leaked_field():
    response = {"id": 42, "email": "qa@example.test", "password_hash": "x9f"}
    assert unexpected_fields(["id", "email", "name"], response) == ["password_hash"]


def test_order_of_response():
    """Порядок — як у відповіді: перебирай ключі response."""
    response = {"debug": True, "id": 1, "internal_id": 7}
    assert unexpected_fields(["id"], response) == ["debug", "internal_id"]


def test_none_value_counts_as_field():
    """Поле з None — теж поле: дивись на ключі, а не на значення."""
    assert unexpected_fields(["id"], {"id": 1, "token": None}) == ["token"]


def test_all_allowed():
    assert unexpected_fields(["id", "email"], {"id": 1}) == []
