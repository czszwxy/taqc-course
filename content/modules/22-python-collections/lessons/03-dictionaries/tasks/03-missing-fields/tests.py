from solution import missing_fields

RESPONSE = {"id": 42, "email": "qa@gadgetly.test", "phone": None, "active": False}


def test_missing():
    assert missing_fields(["id", "email", "name"], RESPONSE) == ["name"]


def test_none_value_is_present():
    """Поле зі значенням None присутнє: перевіряй ключ (in), а не значення (get)."""
    assert missing_fields(["phone"], RESPONSE) == []


def test_false_value_is_present():
    """False — теж значення: поле active є у відповіді."""
    assert missing_fields(["active"], RESPONSE) == []


def test_order_of_required():
    assert missing_fields(["b", "id", "a"], RESPONSE) == ["b", "a"]


def test_all_present():
    assert missing_fields([], RESPONSE) == []
