from solution import order_total


def test_with_discount():
    order = {"items": [{"price": 450, "qty": 2}, {"price": 150, "qty": 1}], "discount": 100}
    assert order_total(order) == 950


def test_quantity_counts():
    """Помнож ціну на кількість: price * qty."""
    assert order_total({"items": [{"price": 450, "qty": 3}], "discount": 0}) == 1350


def test_no_discount_key():
    """Ключа discount немає — знижка 0: order.get("discount", 0)."""
    assert order_total({"items": [{"price": 450, "qty": 2}]}) == 900


def test_not_below_zero():
    """Знижка більша за суму — результат 0, не від'ємний."""
    assert order_total({"items": [{"price": 100, "qty": 1}], "discount": 500}) == 0


def test_no_items():
    assert order_total({"items": []}) == 0
