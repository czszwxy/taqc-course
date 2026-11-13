from subject import order_total


def make_order(**overrides):
    order = {"items": [{"price": 450, "qty": 1}], "discount": 0}
    order.update(overrides)
    return order


def test_single_item():
    assert order_total(make_order()) == 450


def test_quantity_is_multiplied():
    assert order_total(make_order(items=[{"price": 450, "qty": 2}])) == 900


def test_discount_is_subtracted():
    assert order_total(make_order(discount=100)) == 350


def test_missing_discount_means_zero():
    order = make_order()
    del order["discount"]
    assert order_total(order) == 450


def test_total_never_below_zero():
    assert order_total(make_order(discount=10000)) == 0
