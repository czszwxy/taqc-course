from subject import order_total


def test_single_item():
    order = {"items": [{"price": 450, "qty": 1}], "discount": 0}
    assert order_total(order) == 450


# твій код тут
