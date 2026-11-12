from solution import order_summary


def test_two_items():
    """2 * "450" дає "450450" — перетвори і ціну на число: int(price)."""
    assert order_summary("2", "450") == "Total: 900 UAH"


def test_spaces_in_quantity():
    assert order_summary(" 3 ", "100") == "Total: 300 UAH"


def test_single_item():
    assert order_summary("1", "99") == "Total: 99 UAH"
