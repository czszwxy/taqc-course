from solution import first_item_title


def test_first_title():
    assert first_item_title({"data": {"items": [{"title": "Mouse"}, {"title": "Cable"}]}}) == "Mouse"


def test_empty_items():
    """Порожній список — None: перевір items перед items[0]."""
    assert first_item_title({"data": {"items": []}}) is None


def test_items_none():
    """items = None — теж None: data.get("items") or []."""
    assert first_item_title({"data": {"items": None}}) is None


def test_data_none():
    assert first_item_title({"data": None}) is None


def test_no_title():
    assert first_item_title({"data": {"items": [{"price": 450}]}}) is None


def test_empty_response():
    assert first_item_title({}) is None
