from solution import User, user_from_api


def test_maps_camel_case():
    """"firstName" з API → поле first_name."""
    data = {"id": 42, "email": "qa@example.test", "firstName": "Olena", "isAdmin": False}
    assert user_from_api(data) == User(42, "qa@example.test", "Olena")


def test_phone_default_none():
    assert User(1, "a@example.test", "A").phone is None


def test_phone_from_api():
    data = {"id": 7, "email": "b@example.test", "firstName": "Bohdan", "phone": "+380501234567"}
    assert user_from_api(data).phone == "+380501234567"
