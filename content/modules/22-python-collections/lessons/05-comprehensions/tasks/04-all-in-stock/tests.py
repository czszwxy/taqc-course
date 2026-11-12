from solution import all_in_stock


def test_all_in_stock():
    assert all_in_stock([{"name": "Mouse", "in_stock": True}, {"name": "Cable", "in_stock": True}]) is True


def test_one_out_of_stock():
    assert all_in_stock([{"name": "Mouse", "in_stock": True}, {"name": "Hub", "in_stock": False}]) is False


def test_empty_catalog_is_not_success():
    """all([]) дає True — додай перевірку, що список не порожній."""
    assert all_in_stock([]) is False
