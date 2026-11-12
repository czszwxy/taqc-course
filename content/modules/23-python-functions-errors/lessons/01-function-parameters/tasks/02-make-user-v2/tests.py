from solution import make_order


def test_defaults():
    assert make_order() == {"status": "created", "items": [], "discount": 0}


def test_override():
    assert make_order(status="paid", discount=100) == {"status": "paid", "items": [], "discount": 100}


def test_items_list_is_fresh():
    """Новий список items на кожен виклик: створюй словник з [] усередині функції."""
    first = make_order()
    first["items"].append("Mouse")
    assert make_order()["items"] == []


def test_orders_are_independent():
    first = make_order()
    first["status"] = "cancelled"
    assert make_order()["status"] == "created"
